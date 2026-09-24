"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ScrollShadow } from "@heroui/react";
import Lightbox, { type LightboxPhoto } from "./Lightbox";
import MapClient, { type FocusRequest, type MapMarker } from "./MapClient";
import { yearColor, yearOf, yearsForLegend } from "@/lib/mapYears";

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

const chipClass = (on: boolean) =>
  [
    // shrink-0 只在窄屏的 nowrap 轨道里起作用；lg 以上换行，芯片从不收缩
    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-metadata-sm font-mono",
    "transition-colors duration-500 ease-out",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    on
      ? "bg-primary text-primary-fixed ring-1 ring-primary"
      : "text-outline ring-1 ring-border-subtle hover:text-primary hover:ring-primary/40",
  ].join(" ");

/**
 * 足迹页的交互容器：持有年份筛选、地点选中与灯箱状态，并渲染头部统计、地图区、
 * 地点列表与底部计数 —— 所有会随筛选变化的数字都出自同一份派生数据。
 * 服务端 page.tsx 只负责取数、HUD 判断与装饰节点。
 */
export default function MapExplorer({
  markers,
  center,
  mapDecorations,
  asideDecor,
  showHud = true,
}: {
  markers: MapMarker[];
  center: [number, number];
  mapDecorations?: ReactNode;
  asideDecor?: ReactNode;
  showHud?: boolean;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: LightboxPhoto[]; index: number } | null>(null);
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});
  // 桌面端列表的内滚容器（移动端它是 display:contents，量不出滚动，见下面的 effect）
  const listScroller = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  const allYears = useMemo(() => yearsForLegend(markers), [markers]);
  const [activeYears, setActiveYears] = useState<Set<number>>(() => new Set(yearsForLegend(markers)));
  const showAllYears = activeYears.size === 0 || activeYears.size >= allYears.length;

  const filteredMarkers = useMemo(
    () =>
      markers.filter((m) => {
        if (showAllYears) return true;
        const y = yearOf(m.shoot_time);
        // 无年份（shoot_time 为空）的照片不属于任何可筛选的年份，任何选择都不把它藏起来 ——
        // 否则它会从界面消失却仍被总数算过。让它恒在，头部数字也就恒含它，两边永远对得上。
        return y === null || activeYears.has(y);
      }),
    [markers, activeYears, showAllYears]
  );

  // 地点分组从 filteredMarkers 派生：列表、头部统计、底部计数共用这一份
  const locations = useMemo<ExplorerLocation[]>(() => {
    const acc = new Map<string, ExplorerLocation>();
    filteredMarkers.forEach((m) => {
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
  }, [filteredMarkers]);

  const toggleYear = (y: number) =>
    setActiveYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) next.delete(y);
      else next.add(y);
      // 全部取消 = 全部：不允许出现「地图空了但不知道为什么」
      return next.size === 0 ? new Set(allYears) : next;
    });

  // 选中地点是否还在当前筛选结果里 —— 用派生而不是 useEffect 回写 state：
  // 既避免 set-state-in-effect，也让「筛掉再筛回来」时选中自然复原，
  // 且地图那侧拿到的是 null，不会残留已不可见地点的强调
  const activeName = active !== null && locations.some((l) => l.name === active) ? active : null;

  const openLightbox = (photos: MapMarker[], index: number) =>
    setLightbox({ photos: toLightboxPhotos(photos), index });

  // 列表 -> 地图：切换选中并请求 flyTo（重复点同一项也要重新飞）
  const selectFromList = (name: string) => {
    const next = activeName === name ? null : name;
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
    if (!activeName) return;
    // 只有列表真的是个内滚盒子时才把它滚进视野。移动端列表铺在文档流里，
    // 这时候 scrollIntoView 会去滚整页，用户刚点的地图标记立刻被顶出屏幕。
    // display:contents 的元素 clientHeight/scrollHeight 都是 0，正好据此判断「当前没有内滚」。
    const scroller = listScroller.current;
    if (!scroller || scroller.scrollHeight - scroller.clientHeight < 2) return;
    rows.current[activeName]?.scrollIntoView({ block: "nearest" });
  }, [activeName]);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    if (e.key === "Escape") {
      setActive(null);
      setHovered(null);
    }
  };

  return (
    <>
      {/* 头部：一行搞定，左侧标题 + 统计，右侧年份筛选；底纹与 border-b 维持原样 */}
      <section className="relative w-full border-b border-primary/15 bg-primary-fixed/5 px-4 pt-4 pb-3 md:px-grid-margin">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(20,20,20,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(20,20,20,0.05) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          opacity: 0.2,
        }} />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <h1 className="text-xl text-primary uppercase md:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              影像足迹
            </h1>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-metadata-sm text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                {locations.length} 地点
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">photo_camera</span>
                {filteredMarkers.length} 照片
              </span>
            </div>
          </div>

          {allYears.length > 0 && (
            /*
              窄屏放不下时让年份芯片横向滑动而不是换行：头部每多占一行，下面 52vh 的
              地图与列表就被往下挤一行。渐隐只在真的滑得动时出现（ScrollShadow 内置判断），
              lg 以上用 contents 把这一层盒子摘掉，恢复原来的 flex-wrap 单行/多行换行。
            */
            <ScrollShadow orientation="horizontal" hideScrollBar className="min-w-0 lg:contents">
              <div
                role="group"
                aria-label="按年份筛选"
                className="flex w-max flex-nowrap items-center gap-1.5 lg:w-auto lg:flex-wrap"
              >
                {allYears.map((y) => {
                  const on = showAllYears || activeYears.has(y);
                  return (
                    <button
                      key={y}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleYear(y)}
                      className={chipClass(on)}
                    >
                      <span
                        aria-hidden
                        className="h-2 w-2 rounded-full"
                        style={on ? { background: yearColor(y) } : { boxShadow: `inset 0 0 0 1.5px ${yearColor(y)}` }}
                      />
                      {y}
                    </button>
                  );
                })}
              </div>
            </ScrollShadow>
          )}
        </div>
      </section>

      <div className="relative border-y border-primary/15 lg:flex lg:flex-1 lg:min-h-0 lg:flex-col">
        <div className="flex flex-col lg:flex-1 lg:min-h-0 lg:flex-row">
          {/* 窄屏：地图按视口比例给高度（52vh），并留 320px 下限防止矮屏手机被压成一条；
              列表跟着铺在文档流里，整页只有页面自身一个滚动容器。
              lg 起恢复「锁视口 + 列表内滚」：下面那套 lg:* 原样接管，一个像素都不受移动端影响。 */}
          <div className="relative h-[52vh] min-h-[320px] lg:h-full lg:min-h-0 lg:flex-1">
            {mapDecorations}

            {/*
              地名搜索（在 MapClient 内）走 Open-Meteo / Photon 全球检索，不受年份筛选影响：
              它是「定位」用途而非「浏览」用途，点选结果后正常 flyTo，
              即使该处标记已被筛掉也不做任何特殊处理。
            */}
            <MapClient
              markers={filteredMarkers}
              center={center}
              activeLocation={activeName}
              hoveredLocation={hovered}
              focusRequest={focus}
              keyboardEnabled={!lightbox}
              onSelectLocation={selectFromMap}
            />
          </div>

          <aside className="relative w-full glass-panel lg:h-full lg:min-h-0 lg:w-80">
            {asideDecor}
            {/*
              移动端把 ScrollShadow 变成 display:contents：盒子不再被生成，于是它的
              overflow-y:auto 与上下 mask 一起消失，列表直接铺进文档流——比「留着盒子
              再逐条否定它的内置行为」干净，也不会多出第二个滚动容器。
              ScrollShadow 自身就是桌面端的滚动容器（overflow-y:auto + 上下 mask 渐隐），
              所以 aside 不挂 overflow-y-auto，滚动只发生在列表内部。
            */}
            <ScrollShadow ref={listScroller} className="h-full max-lg:contents" orientation="vertical">
              <div className="p-4 md:p-6">
                {/* 移动端列表铺进文档流后，这行标题+计数是纯开销：头部已经写着「N 地点」。
                    省下的三十来像素正好换回一个完整地点条目。lg 起照旧显示。 */}
                <div className="mb-3 hidden items-baseline justify-between gap-2 lg:flex">
                  <h2 className="text-label-caps text-outline">地点</h2>
                  <span className="text-metadata-sm text-outline font-mono">{locations.length}</span>
                </div>
                {locations.length === 0 ? (
                  <p className="text-metadata-sm text-outline">
                    {markers.length === 0 ? "暂无带坐标的照片" : "该年份下没有带坐标的照片"}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-5" onKeyDown={onKeyDown}>
                    {locations.map((loc) => {
                      const isActive = activeName === loc.name;
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
                              {/* 图标不参与基线对齐：material symbols 与正文的基线度量不同，
                                  self-center 让字身盒对正文字行盒，无需像素补偿 */}
                              <span className="material-symbols-outlined shrink-0 self-center text-[14px] text-primary">
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
        </div>
      </div>

      <div className="flex w-full flex-col justify-between gap-2 border-x border-primary/15 px-4 py-4 text-metadata-sm sm:flex-row sm:items-center md:px-grid-margin">
        <span className="text-on-surface-variant flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full border border-primary/50" />
          <span className="w-4 border-t border-dashed border-primary/25" />
          {filteredMarkers.length} 张带坐标的照片
          {!showAllYears && <span className="text-outline">（已按年份筛选）</span>}
        </span>
        {showHud && (
          <span className="w-1.5 h-1.5 rounded-full bg-mint-accent border border-primary animate-pulse" />
        )}
      </div>

      {lightbox && (
        <Lightbox
          photos={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((s) => (s ? { ...s, index } : s))}
        />
      )}
    </>
  );
}
