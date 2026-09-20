"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ScrollShadow } from "@heroui/react";
import Lightbox, { type LightboxPhoto } from "./Lightbox";
import MapClient, { type FocusRequest, type MapMarker } from "./MapClient";

export interface ExplorerLocation {
  name: string;
  count: number;
  photos: MapMarker[];
}

const toLightboxPhotos = (photos: MapMarker[]): LightboxPhoto[] =>
  photos.map((p) => ({ id: p.id, title: p.title, shoot_time: p.shoot_time ?? null, camera_model: p.camera }));

const rowButtonClass = (active: boolean) =>
  [
    "relative flex min-w-0 flex-1 items-baseline gap-2 rounded-md text-left",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    active ? "font-medium text-primary" : "text-on-surface",
  ].join(" ");

/**
 * 足迹页的交互容器：从 markers 派生地点分组，持有选中态与灯箱状态，
 * 让右侧列表与地图标记双向联动。取数与页面骨架仍在服务端 page.tsx。
 */
export default function MapExplorer({
  markers,
  center,
  mapUnderlay,
  mapOverlay,
  asideDecor,
}: {
  markers: MapMarker[];
  center: [number, number];
  mapUnderlay?: ReactNode;
  mapOverlay?: ReactNode;
  asideDecor?: ReactNode;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null);
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});
  const seq = useRef(0);

  // 按地点分组，完全从 markers 派生 —— 下一轮加年份筛选时只需在这条链上游过滤
  const locations = useMemo<ExplorerLocation[]>(() => {
    const acc = new Map<string, ExplorerLocation>();
    markers.forEach((m) => {
      const name = m.location ?? "Unknown Location";
      const group = acc.get(name);
      if (group) {
        group.photos.push(m);
        group.count++;
      } else {
        acc.set(name, { name, count: 1, photos: [m] });
      }
    });
    return Array.from(acc.values());
  }, [markers]);

  const openLightbox = (photos: MapMarker[], index: number) =>
    setLightbox({ photos: toLightboxPhotos(photos), index });

  // 列表 -> 地图：切换选中并请求 flyTo（重复点同一项也要重新飞）
  const selectFromList = (name: string) => {
    const next = active === name ? null : name;
    setActive(next);
    if (next) {
      seq.current += 1;
      setFocus({ name: next, seq: seq.current });
    }
  };

  // 地图 -> 列表：只切选中态，不反向移动地图视野。
  // name 为 null 表示点击了跨地点的聚合体：视野已离开原选中地点，直接清除选中。
  const selectFromMap = (name: string | null) =>
    setActive((prev) => (name === null || prev === name ? null : name));

  useEffect(() => {
    if (active) rows.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "Escape") {
      setActive(null);
      setHovered(null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-1 lg:min-h-0 lg:flex-row">
      <div className="relative h-[400px] lg:h-full lg:min-h-0 lg:flex-1">
        {mapUnderlay}

        <MapClient
          markers={markers}
          center={center}
          activeLocation={active}
          hoveredLocation={hovered}
          focusRequest={focus}
          keyboardEnabled={!lightbox}
          onSelectLocation={selectFromMap}
        />

        {mapOverlay}
      </div>

      <aside className="relative h-[300px] w-full glass-panel lg:h-full lg:min-h-0 lg:w-80">
        {asideDecor}
        {/* ScrollShadow 自身就是滚动容器（overflow-y:auto + 上下 mask 渐隐），
            所以 aside 不再挂 overflow-y-auto，滚动只发生在列表内部 */}
        <ScrollShadow className="h-full" orientation="vertical">
          <div className="p-4 md:p-6">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-label-caps text-outline">地点</h2>
              <span className="text-metadata-sm text-outline font-mono">{locations.length}</span>
            </div>
            {locations.length === 0 ? (
              <p className="text-metadata-sm text-outline">暂无带坐标的照片</p>
            ) : (
              <ul className="flex flex-col gap-5" onKeyDown={onKeyDown}>
                {locations.map((loc) => {
                  const isActive = active === loc.name;
                  const overflow = loc.count - 3;
                  return (
                    <li
                      key={loc.name}
                      className="group -mx-2 relative rounded-lg px-2 py-2 transition-colors duration-500 ease-out hover:bg-primary/[0.04]"
                    >
                      {isActive && (
                        <span aria-hidden className="absolute -left-[5px] top-2 bottom-2 w-[3px] rounded-full bg-primary" />
                      )}
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <button
                          type="button"
                          ref={(el) => {
                            rows.current[loc.name] = el;
                          }}
                          aria-pressed={isActive}
                          onClick={() => selectFromList(loc.name)}
                          onMouseEnter={() => setHovered(loc.name)}
                          onMouseLeave={() => setHovered((h) => (h === loc.name ? null : h))}
                          onFocus={() => setHovered(loc.name)}
                          onBlur={() => setHovered((h) => (h === loc.name ? null : h))}
                          className={rowButtonClass(isActive)}
                        >
                          <span className="material-symbols-outlined shrink-0 translate-y-[3px] text-[16px] text-primary">
                            location_on
                          </span>
                          <span className="min-w-0 break-words text-metadata-sm transition-colors duration-500 ease-out group-hover:text-primary">
                            {loc.name}
                          </span>
                        </button>
                        {/* 「N 张」是灯箱入口之一：p-1.5 -m-1.5 把命中区向四周扩 6px 而不移动文字 */}
                        <button
                          type="button"
                          onClick={() => openLightbox(loc.photos, 0)}
                          aria-label={`浏览 ${loc.name} 的全部 ${loc.count} 张照片`}
                          className="-m-1.5 inline-flex shrink-0 cursor-pointer items-baseline rounded p-1.5 text-metadata-sm font-mono text-outline underline-offset-2 transition-colors duration-500 ease-out hover:bg-primary/[0.06] hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          {loc.count} 张
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {loc.photos.slice(0, 3).map((p, i) => (
                          <div key={p.id} className="relative h-16">
                            <a
                              href={`/photo/${p.id}`}
                              onClick={(e) => {
                                // 保留 href：Cmd/Ctrl/中键仍然新标签打开详情页
                                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                                e.preventDefault();
                                openLightbox(loc.photos, i);
                              }}
                              className="group/thumb block h-full w-full overflow-hidden rounded-md ring-1 ring-black/5"
                            >
                              <img
                                src={p.thumbnail}
                                alt={p.title}
                                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover/thumb:scale-[1.04]"
                              />
                              {i === 2 && overflow > 0 && (
                                <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
                              )}
                            </a>
                            {i === 2 && overflow > 0 && (
                              <button
                                type="button"
                                onClick={() => openLightbox(loc.photos, 3)}
                                aria-label={`浏览 ${loc.name} 第 4 张起的 ${overflow} 张照片`}
                                className="absolute bottom-0 right-0 rounded-md p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                <span className="block rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-mono text-white">
                                  +{overflow}
                                </span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ScrollShadow>
      </aside>

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((s) => (s ? { ...s, index } : s))}
        />
      )}
    </div>
  );
}
