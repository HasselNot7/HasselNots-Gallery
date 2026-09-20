"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Marker } from "leaflet";
import { SearchField, Spinner } from "@heroui/react";
import { attachLayerSwitcher } from "@/lib/mapLayers";
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

export default function MapClient({
  markers,
  center,
  activeLocation,
  hoveredLocation,
  focusRequest,
  onSelectLocation,
}: {
  markers: MapMarker[];
  center: [number, number];
  activeLocation?: string | null;
  hoveredLocation?: string | null;
  focusRequest?: FocusRequest | null;
  /** 传地点名 = 选中该地点；传 null = 清除选中（点击跨地点聚合体时用） */
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
    map._searchMarker.bindPopup(
      `<div style="font-family:Inter,sans-serif;font-size:13px;color:#141414;padding:2px 4px;"><strong>${r.name}</strong><br/><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#727973;">${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</span><br/><span style="font-size:11px;color:#727973;">${label}</span></div>`
    ).openPopup();
  };

  useEffect(() => {
    let map: any;
    import("leaflet").then(({ default: L }) => {
      const mapContainer = document.getElementById("leaflet-map");
      if (!mapContainer || (mapContainer as any)._leaflet_id) return;

      map = L.map("leaflet-map").setView(center, markers.length === 1 ? 12 : 5);
      mapRef.current = map;
      LRef.current = L;
      markersByName.current = new Map();
      attachLayerSwitcher(map, L, 5);

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
        const photosHtml = c.photos
          .map(
            (m) => `
            <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #eef1ee;align-items:center;">
              <a href="/photo/${m.id}" style="flex-shrink:0;width:88px;height:88px;overflow:hidden;border:1px solid #e2e8e2;display:block;">
                <img src="${m.thumbnail}" alt="${m.title}" style="width:100%;height:100%;object-fit:cover;" />
              </a>
              <div style="min-width:0;">
                <a href="/photo/${m.id}" style="font-size:13px;font-weight:500;color:#141414;text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.title}</a>
                ${m.camera ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#727973;margin-top:2px;">${m.camera}</div>` : ""}
              </div>
            </div>`
          )
          .join("");
        return `<div style="font-family:Inter,sans-serif;max-width:240px;">
            <div style="display:flex;align-items:center;gap:6px;padding:8px 0 4px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#727973;letter-spacing:0.05em;text-transform:uppercase;">
              <span style="width:6px;height:6px;border-radius:50%;background:#141414;display:inline-block;"></span>
              ${c.count} photo${c.count > 1 ? "s" : ""} at this location
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#727973;padding-bottom:4px;">${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}</div>
            ${photosHtml}
          </div>`;
      };

      /**
       * 按当前 zoom 重画标记。聚合只是视觉合并、不代表数据合并，因此点击分两种：
       * - 簇内所有点同属一个 location_name -> 等价于点击该地点：选中 + 列表联动 + 弹照片
       * - 簇跨多个 location_name -> 只放大到簇范围（至少一级），并清除选中与强调态，
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
          const entry: RegisteredMarker = { marker, color: c.color, count: c.count, names: c.names, emphasis: "none" };
          c.names.forEach((n) => {
            const list = markersByName.current.get(n);
            if (list) list.push(entry);
            else markersByName.current.set(n, [entry]);
          });

          if (c.names.length <= 1) {
            marker.bindPopup(popupHtml(c), { maxWidth: 260, maxHeight: 320 });
            if (c.names.length === 1) marker.on("click", () => selectRef.current?.(c.names[0]));
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

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50] });

      // 建完立刻按最终 zoom 画一次（fitBounds 之后再由 zoomend 重算）
      render();

      // Ensure correct sizing after mount (mobile layouts, late CSS, etc.)
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 300);
    });

    return () => {
      if (map) map.remove();
      if (mapRef.current === map) mapRef.current = null;
      LRef.current = null;
      markersByName.current.clear();
    };
  }, [markers, center, applyEmphasis]);

  return (
    <div className="relative w-full h-full">
      <div id="leaflet-map" className="w-full h-full" />
      {/* 地名搜索框 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[600] w-64 max-w-[80%]">
        <SearchField
          fullWidth
          value={query}
          onChange={(v) => {
            handleSearch(v);
            setShowResults(true);
          }}
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
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
