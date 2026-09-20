"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import MapClient, { type FocusRequest, type MapMarker } from "./MapClient";

export interface ExplorerLocation {
  name: string;
  count: number;
  photos: MapMarker[];
}

const rowClass = (active: boolean) =>
  [
    "relative -mx-2 flex w-[calc(100%+1rem)] items-center gap-2 rounded-lg px-2 py-1 text-left text-metadata-sm transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    active
      ? "bg-primary/10 font-medium text-primary"
      : "text-on-surface hover:bg-primary/5 hover:text-primary",
  ].join(" ");

/**
 * 足迹页的交互容器：持有「当前选中地点」，让右侧列表与地图标记双向联动。
 * 取数与装饰仍由服务端页面负责，这里只接住已算好的数据与装饰节点。
 */
export default function MapExplorer({
  markers,
  center,
  locations,
  mapUnderlay,
  mapOverlay,
  asideDecor,
}: {
  markers: MapMarker[];
  center: [number, number];
  locations: ExplorerLocation[];
  mapUnderlay?: ReactNode;
  mapOverlay?: ReactNode;
  asideDecor?: ReactNode;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});
  const seq = useRef(0);

  // 列表 -> 地图：切换选中并请求 flyTo（重复点同一项也要重新飞）
  const selectFromList = (name: string) => {
    const next = active === name ? null : name;
    setActive(next);
    if (next) {
      seq.current += 1;
      setFocus({ name: next, seq: seq.current });
    }
  };

  // 地图 -> 列表：只切选中态，不反向移动地图视野
  const selectFromMap = (name: string) => setActive((prev) => (prev === name ? null : name));

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
          onSelectLocation={selectFromMap}
        />

        {mapOverlay}
      </div>

      <aside className="relative h-[300px] w-full overflow-y-auto glass-panel lg:h-full lg:min-h-0 lg:w-80">
        {asideDecor}
        <div className="p-4 md:p-6">
          <h2 className="text-headline-mobile font-bold uppercase text-primary tracking-widest border-b border-primary/15 pb-2 mb-4">
            地点
          </h2>
          {locations.length === 0 ? (
            <p className="text-metadata-sm text-outline">暂无带坐标的照片</p>
          ) : (
            <ul className="flex flex-col gap-4" onKeyDown={onKeyDown}>
              {locations.map((loc) => {
                const isActive = active === loc.name;
                return (
                  <li key={loc.name} className="border-b border-primary/10 pb-4 last:border-0">
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
                      className={rowClass(isActive)}
                    >
                      {isActive && (
                        <span aria-hidden className="absolute bottom-1 left-[-8px] top-1 w-[3px] bg-primary" />
                      )}
                      <span className="material-symbols-outlined shrink-0 text-[16px] text-primary">location_on</span>
                      <span className="break-words">{loc.name}</span>
                    </button>
                    <div
                      className="text-metadata-sm font-medium text-primary mb-2"
                      style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}
                    >
                      {loc.count} 张
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {(loc.count > 3 ? loc.photos.slice(0, 2) : loc.photos).map((p) => (
                        <a
                          key={p.id}
                          href={`/photo/${p.id}`}
                          className="w-auto h-16 border border-primary/15 overflow-hidden hover:border-primary transition-colors"
                        >
                          <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                        </a>
                      ))}
                      {loc.count > 3 && (
                        <span className="w-auto h-16 bg-surface-dim flex items-center justify-center text-metadata-sm text-on-surface-variant font-mono">
                          +{loc.count - 2}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
