"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Marker } from "leaflet";
import { SearchField, Spinner } from "@heroui/react";
import { attachLayerSwitcher, resolveLayerIndex } from "@/lib/mapLayers";
import { DEFAULT_MAP_CONFIG, fetchMapConfig } from "@/lib/map-config";
import { clusterBasePoints, type BasePoint, type Cluster } from "@/lib/mapCluster";
import { yearColor, yearOf } from "@/lib/mapYears";
import { searchPlaces, GeoResult } from "@/lib/geocode";

export interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  thumbnail: string;
  camera: string;
  shoot_time?: string;
  location?: string;
}

/** 标记的强调等级：选中 > 悬停 > 常态 */
type Emphasis = "active" | "hover" | "none";

/** 一个可渲染标记（可能是若干同坐标分组按当前 zoom 合并出来的簇） */
type RegisteredMarker = {
  marker: Marker;
  color: string;
  count: number;
  names: string[];
  emphasis: Emphasis;
};

export interface FocusRequest {
  name: string;
  seq: number;
}

/** 弹窗内容是拼 HTML 字符串的，标题来自 EXIF/用户编辑，必须转义 */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);

/**
 * 相机原始文件名：只有字母数字下划线连字符（没有空格、没有中日韩）且含 4 位以上连续数字。
 * 命中就当它没有标题 —— 同一地点三行都显示 `_DSF20` 前缀是零信息量的。
 */
const isRawCameraName = (t: string) => !/[\s\u3400-\u9fff]/.test(t) && /\d{4}/.test(t);

/** 行标签回落顺序：有意义的 title → 拍摄日期 → 第 N 张 */
const rowLabel = (m: MapMarker, i: number) => {
  const t = m.title?.trim();
  if (t && !isRawCameraName(t)) return t;
  return m.shoot_time ? m.shoot_time.slice(0, 10) : `第 ${i + 1} 张`;
};

export default function MapClient({
  markers,
  center,
  activeLocation,
  hoveredLocation,
  focusRequest,
  keyboardEnabled = true,
  onSelectLocation,
}: {
  markers: MapMarker[];
  center: [number, number];
  activeLocation?: string | null;
  hoveredLocation?: string | null;
  focusRequest?: FocusRequest | null;
  /** 灯箱等有全屏键盘监听的浮层打开时置 false，避免方向键同时平移地图 */
  keyboardEnabled?: boolean;
  /** 地图只会传 null（点跨地点聚合体时清除选中）；传地点名 = 选中该地点，由列表侧驱动 */
  onSelectLocation?: (location: string | null) => void;
}) {
  const mapRef = useRef<any>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  // 地点名 -> 该地点当前可见的标记（跨地点的簇会同时登记在它包含的每个地点名下）
  const markersByName = useRef<Map<string, RegisteredMarker[]>>(new Map());
  // 地点名 -> 该地点所有照片的加权中心，flyTo 用它，避免受聚合形态影响
  const centroidByName = useRef<Map<string, [number, number]>>(new Map());
  const activeRef = useRef<string | null>(null);
  const hoverRef = useRef<string | null>(null);
  // onSelectLocation 每次渲染同步，避免标记回调拿到旧闭包
  const selectRef = useRef(onSelectLocation);
  useEffect(() => {
    selectRef.current = onSelectLocation;
  });
  const keyboardRef = useRef(keyboardEnabled);
  // Leaflet 的 Keyboard 处理器同时吃 方向键 与 +/-，浮层打开期间要让给它
  const applyKeyboard = useCallback(() => {
    const map = mapRef.current;
    if (!map?.keyboard) return;
    if (keyboardRef.current) map.keyboard.enable();
    else map.keyboard.disable();
  }, []);
  useEffect(() => {
    keyboardRef.current = keyboardEnabled;
    applyKeyboard();
  }, [keyboardEnabled, applyKeyboard]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 标记外观。emphasis 为 "none" 时逐字保持重写前的样式（详情页单点地图只用这一档），
   * 选中/悬停只是把圆点放大、描边加粗并叠一圈光晕。
   */
  const iconSpec = (
    color: string,
    count: number,
    emphasis: Emphasis
  ): { className: string; html: string; iconSize: [number, number]; iconAnchor: [number, number] } => {
    const grown = emphasis !== "none";
    const size = (count > 1 ? 22 : 12) + (emphasis === "active" ? 8 : emphasis === "hover" ? 4 : 0);
    const ring = "#f8faf8";
    const border = grown ? 3 : 2;
    const halo =
      emphasis === "active" ? ",0 0 0 4px rgba(20,20,20,0.22)" : emphasis === "hover" ? ",0 0 0 3px rgba(20,20,20,0.12)" : "";
    const html =
      count > 1
        ? `<div style="width:${size}px;height:${size}px;background:${color};color:#fff;border-radius:50%;border:${border}px solid ${ring};box-shadow:0 2px 4px rgba(0,0,0,0.25)${halo};cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:${grown ? 13 : 11}px;font-weight:700;">${count}</div>`
        : `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:${border}px solid ${ring};box-shadow:0 2px 4px rgba(0,0,0,0.2)${halo};cursor:pointer;"></div>`;
    return { className: "custom-marker", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] };
  };

  // 只改 icon 与层级，不重建标记；重复调用时按已记录的状态跳过无变化的标记
  const applyEmphasis = useCallback(() => {
    const L = LRef.current;
    if (!L) return;
    const seen = new Set<RegisteredMarker>();
    markersByName.current.forEach((group) => {
      group.forEach((entry) => {
        if (seen.has(entry)) return;
        seen.add(entry);
        // 跨地点的簇只要包含目标地点就给反馈；它本身不会被「选中」，见点击规则
        const hit = (name: string | null) => (name ? entry.names.includes(name) : false);
        const state: Emphasis = hit(activeRef.current) ? "active" : hit(hoverRef.current) ? "hover" : "none";
        if (entry.emphasis !== state) {
          entry.emphasis = state;
          entry.marker.setIcon(L.divIcon(iconSpec(entry.color, entry.count, state)));
        }
        entry.marker.setZIndexOffset(state === "active" ? 1000 : state === "hover" ? 600 : 0);
      });
    });
  }, []);

  useEffect(() => {
    activeRef.current = activeLocation ?? null;
    applyEmphasis();
  }, [activeLocation, applyEmphasis]);

  useEffect(() => {
    hoverRef.current = hoveredLocation ?? null;
    applyEmphasis();
  }, [hoveredLocation, applyEmphasis]);

  // 列表点击 -> 地图飞过去（seq 变化即重新触发，重复点同一项也有效）
  useEffect(() => {
    if (!focusRequest) return;
    const map = mapRef.current;
    const at = centroidByName.current.get(focusRequest.name);
    if (!map || !at) return;
    map.flyTo(at, Math.max(map.getZoom(), 9), { duration: 0.9 });
  }, [focusRequest]);

  const handleSearch = (q: string) => {
    setQuery(q);
    setShowResults(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        setResults(await searchPlaces(q.trim()));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const jumpTo = (r: GeoResult) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([r.latitude, r.longitude], 10, { duration: 1.2 });
    setResults([]);
    setShowResults(false);
    setQuery(r.name);

    // 临时搜索标记（薄荷色），与其他摄影标记区分
    const L = (window as any).L;
    if (map._searchMarker) map.removeLayer(map._searchMarker);
    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:20px;height:20px;background:#2b2b2b;border-radius:50%;border:3px solid #141414;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
    map._searchMarker = L.marker([r.latitude, r.longitude], { icon }).addTo(map);
    // 与摄影标记的 popup 同一套 .mp 外壳与 maxWidth，两种弹窗风格不能一个定制一个没动
    map._searchMarker
      .bindPopup(
        `<div class="mp"><div class="mp-head">
            <div class="mp-title">${esc(r.name)}</div>
            <div class="mp-coord">${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</div>
            <div class="mp-coord">${esc(label)}</div>
          </div></div>`,
        { maxWidth: 280 }
      )
      .openPopup();
  };

  useEffect(() => {
    let map: any;
    let disposed = false;
    let container: HTMLElement | null = null;
    const closeOnEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") mapRef.current?.closePopup();
    };
    import("leaflet").then(async ({ default: L }) => {
      const mapContainer = document.getElementById("leaflet-map");
      // StrictMode 会先跑一次 cleanup 再跑第二次 effect，而首次的 map 是异步建的：
      // 没有 disposed 就会留下一个「卸载时无人可拆」的地图，之后 _leaflet_id 挡住所有重建
      if (disposed || !mapContainer || (mapContainer as any)._leaflet_id) return;

      // 拿不到配置就按默认建图：底图照样出图，不该因此整张地图打不开
      const mapConfig = await fetchMapConfig().catch(() => DEFAULT_MAP_CONFIG);
      if (disposed) return;

      map = L.map("leaflet-map").setView(center, markers.length === 1 ? 12 : 5);
      mapRef.current = map;
      LRef.current = L;
      markersByName.current = new Map();
      attachLayerSwitcher(map, L, resolveLayerIndex(mapConfig.default_map_layer), mapConfig);

      const bounds: [number, number][] = [];

      // Group markers by coordinate (rounded to 4 decimals)
      const groups = new Map<string, MapMarker[]>();
      markers.forEach((m) => {
        const key = `${m.latitude.toFixed(4)},${m.longitude.toFixed(4)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
      });

      // 基础点：按坐标分组的结果，是聚合的最小单位
      const basePoints: BasePoint<MapMarker>[] = [];
      const centroid = new Map<string, { lat: number; lng: number; n: number }>();
      groups.forEach((group) => {
        const lat = group[0].latitude;
        const lng = group[0].longitude;
        bounds.push([lat, lng]);

        // 取组内最新拍摄年份作为标记颜色
        let year: number | null = null;
        group.forEach((m) => {
          const y = yearOf(m.shoot_time);
          if (y !== null && (year === null || y > year)) year = y;
        });
        const name = group[0].location ?? null;
        basePoints.push({
          lat,
          lng,
          count: group.length,
          color: year !== null ? yearColor(year) : "#141414",
          name,
          photos: group,
        });

        if (name) {
          const acc = centroid.get(name) ?? { lat: 0, lng: 0, n: 0 };
          acc.lat += lat * group.length;
          acc.lng += lng * group.length;
          acc.n += group.length;
          centroid.set(name, acc);
        }
      });
      centroidByName.current = new Map(
        Array.from(centroid, ([name, c]) => [name, [c.lat / c.n, c.lng / c.n]] as [string, [number, number]])
      );

      const popupHtml = (c: Cluster<MapMarker>) => {
        const rows = c.photos
          .map(
            (m, i) => `<a class="mp-row" href="/photo/${m.id}">
              <img class="mp-thumb" src="${esc(m.thumbnail)}" alt="" loading="lazy" />
              <span class="mp-label">${esc(rowLabel(m, i))}</span>
            </a>`
          )
          .join("");
        const list =
          c.photos.length > 1
            ? `<div class="mp-list" tabindex="0" role="region" aria-label="该地点的照片列表">${rows}</div>
               <div class="mp-fade" aria-hidden="true"></div>`
            : rows;
        return `<div class="mp">
            <div class="mp-head">
              <div class="mp-title">${esc(c.names[0] ?? "未标注地点")}<span class="mp-count">${c.count} 张</span></div>
              <div class="mp-coord">${c.lat.toFixed(2)}, ${c.lng.toFixed(2)}</div>
            </div>
            ${list}
          </div>`;
      };

      /**
       * 按当前 zoom 重画标记。聚合只是视觉合并、不代表数据合并，因此点击分两种：
       * - 簇内所有点同属一个 location_name -> 只弹该坐标的照片。不回写列表选中：
       *   簇是「该地点在这个坐标上的那几张」，列表行是「该地点全部照片」，两者数量
       *   常常不等（北京 17 张里这个簇只占 12），点亮一行会让用户以为数字对不上；
       *   桌面端还会顺带把列表滚过去。选中只由列表 → 地图单向驱动。
       * - 簇跨多个 location_name -> 放大到簇范围（至少一级），并清除选中与强调态，
       *   因为视野已经离开原选中地点，列表再高亮它会造成 UI 与视野错位
       * 重建一律走 markersByName 注册表（不另起 layerGroup），否则 zoomend 之后
       * applyEmphasis() 会操作已销毁的 marker 而静默失效。
       */
      const render = () => {
        markersByName.current.forEach((list) => list.forEach((e) => map.removeLayer(e.marker)));
        markersByName.current = new Map();

        const zoom = map.getZoom();
        clusterBasePoints((la, ln, z) => map.project([la, ln], z), basePoints, zoom).forEach((c) => {
          const marker = L.marker([c.lat, c.lng], { icon: L.divIcon(iconSpec(c.color, c.count, "none")) }).addTo(map);
          // 点开弹窗后再点一次关，浏览器算 dblclick，地图于是缩放一级。Leaflet 在
          // _fireDOMEvent 里见到 originalEvent._stopped 就不再往地图冒，doubleClickZoom
          // 收不到事件；弹窗容器 Leaflet 自己已经挡过 dblclick，只有 marker 没挡。
          marker.on("dblclick", L.DomEvent.stopPropagation);
          const entry: RegisteredMarker = { marker, color: c.color, count: c.count, names: c.names, emphasis: "none" };
          c.names.forEach((n) => {
            const list = markersByName.current.get(n);
            if (list) list.push(entry);
            else markersByName.current.set(n, [entry]);
          });

          if (c.names.length <= 1) {
            // 不传 maxHeight：Leaflet 一旦启用它就会给内容加 .leaflet-popup-scrolled 的第二层滚动，
            // 与内层 .mp-list 叠成两层两条滚动条。
            // 顶部留 64px：搜索浮层盖在地图上方，弹窗右上角的 ✕ 会落到它下面 ——
            // .leaflet-map-pane 带 transform 自成层叠上下文，弹窗的 z-700 出不去那个上下文，
            // 压不过搜索层的 z-600，只能靠 autoPan 把弹窗整体推离顶部。
            marker.bindPopup(popupHtml(c), {
              maxWidth: 280,
              autoPanPaddingTopLeft: [16, 64],
              autoPanPaddingBottomRight: [16, 16],
            });
          } else {
            marker.on("click", () => {
              selectRef.current?.(null);
              const b = L.latLngBounds(c.photos.map((p) => [p.latitude, p.longitude] as [number, number]));
              // 至少放大一级；上限 +3 级，避免退化边界（同坐标多地点）一步跳到最大缩放
              const fit = map.getBoundsZoom(b);
              const target = Math.min(zoom + 3, map.getMaxZoom(), Math.max(zoom + 1, fit));
              map.flyTo(b.getCenter(), target, { duration: 0.8 });
            });
          }
        });

        applyEmphasis();
      };

      map.on("zoomend", render);

      /*
       * 底部渐隐：滚到底必须消失，否则用户以为下面还有内容。
       * 监听成对挂在 popupopen / popupclose 上 —— 挂在别处会每次开弹窗叠一个监听器。
       */
      let fade: { root: HTMLElement; list: HTMLElement } | null = null;
      const syncFade = () => {
        if (!fade) return;
        const atBottom = fade.list.scrollTop + fade.list.clientHeight >= fade.list.scrollHeight - 1;
        fade.root.dataset.atBottom = String(atBottom);
      };
      map.on("popupopen", (e: { popup: { getElement(): HTMLElement | null } }) => {
        const root = e.popup.getElement()?.querySelector<HTMLElement>(".mp");
        const list = root?.querySelector<HTMLElement>(".mp-list");
        if (!root || !list) return;
        fade = { root, list };
        list.addEventListener("scroll", syncFade);
        syncFade();
      });
      map.on("popupclose", () => {
        fade?.list.removeEventListener("scroll", syncFade);
        fade = null;
      });

      // Leaflet 的 ESC 只在焦点落在地图容器/代理元素上才生效，而点完标记焦点停在 marker
      // 的 div 上，弹窗因此关不掉。补一个容器级 keydown；没开弹窗时 closePopup() 是空操作。
      const mapEl: HTMLElement = map.getContainer();
      container = mapEl;
      mapEl.addEventListener("keydown", closeOnEsc);

      // 地图建好后补一次键盘设置（键盘默认开着，而浮层可能已经先打开了）
      applyKeyboard();

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50] });

      // 建完立刻按最终 zoom 画一次（fitBounds 之后再由 zoomend 重算）
      render();

      // Ensure correct sizing after mount (mobile layouts, late CSS, etc.)
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 300);
    });

    return () => {
      disposed = true;
      // 容器 div 是 React 的，map.remove() 不会带走挂在它上面的监听器；
      // 年份筛选会让这个 effect 整个重跑一遍，不摘就是一次筛选叠一个 handler
      container?.removeEventListener("keydown", closeOnEsc);
      if (map) map.remove();
      else if (mapRef.current) mapRef.current.remove();
      if (mapRef.current) mapRef.current = null;
      LRef.current = null;
      markersByName.current.clear();
    };
  }, [markers, center, applyEmphasis, applyKeyboard]);

  return (
    <div className="relative w-full h-full">
      <div id="leaflet-map" className="w-full h-full" />
      {/*
        地名搜索框。<768px 改成通栏：左边缘让到缩放控件右缘（44px）之后，右留 12px。
        原来居中 w-64 在 390px 上离缩放按钮只剩 23px 间隙，输入区也窄。
        768px 起恢复居中 —— 那一档底图切换器在右上角，通栏会和它叠在一起。
      */}
      <div className="absolute top-3 left-14 right-3 z-[600] md:left-1/2 md:right-auto md:w-64 md:max-w-[80%] md:-translate-x-1/2">
        <SearchField
          fullWidth
          value={query}
          onChange={(v) => {
            handleSearch(v);
            setShowResults(true);
          }}
        >
          {/* 移动端它是画面上唯一显眼的入口控件，压给一点存在感：实底 + 描边 + 44px 命中高度。
              只用 max-lg: 加，桌面端保持原样（这次改动要求桌面逐像素不变） */}
          <SearchField.Group className="max-lg:h-11 max-lg:bg-surface max-lg:ring-1 max-lg:ring-primary/15">
            <SearchField.SearchIcon className="max-lg:text-outline" />
            <SearchField.Input
              className="min-w-0"
              placeholder="搜索地点…"
              onFocus={() => setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.length > 0) jumpTo(results[0]);
              }}
            />
            <SearchField.ClearButton
              onPress={() => {
                setQuery("");
                setResults([]);
                setShowResults(false);
              }}
            />
          </SearchField.Group>
        </SearchField>
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface/95 backdrop-blur border border-border-subtle shadow-lg overflow-hidden rounded-md z-[700]">
            {searching ? (
              <div className="px-4 py-3 text-metadata-sm text-outline flex items-center gap-2">
                <Spinner size="sm" /> 搜索中...
              </div>
            ) : results.length === 0 ? (
              query.trim() && (
                <div className="px-4 py-3 text-metadata-sm text-outline">没有找到相关地点</div>
              )
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => jumpTo(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-mint-accent/30 transition-colors border-b border-border-subtle last:border-0"
                >
                  <div className="text-body-md text-on-surface leading-tight">{r.name}</div>
                  <div className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                    {[r.admin1, r.country].filter(Boolean).join(", ")}
                    <span className="ml-2">{r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
