"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Spinner } from "@heroui/react";
import { Photo, getPhotoImageUrl } from "@/lib/api-server";
import Lightbox from "@/components/Lightbox";
import Reveal from "@/components/reactbits/Reveal";

const PAGE_SIZE = 24;

function DraggableTimeline({ entries, active, onChange }: { entries: string[]; active: string; onChange: (y: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cursorY, setCursorY] = useState<number | null>(null);

  const groups = useMemo(() => {
    const years = [...new Set(entries.map((e) => e.slice(0, 4)))];
    return years.map((y) => ({ year: y, months: entries.filter((e) => e.startsWith(`${y}-`)) }));
  }, [entries]);

  const activeYear = active.slice(0, 4);

  // 拖拽只按 Y 吸附到「年份」是刻意的粗粒度：同一年的月份排在同一水平行内，
  // 共享同一段 Y 区间，纵向坐标无法在它们之间区分；月份级选择留给点击。
  const valueFromY = useCallback(
    (clientY: number) => {
      let bestIdx = -1;
      let bestDist = Infinity;
      rowRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(clientY - (rect.top + rect.height / 2));
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      });
      return bestIdx >= 0 ? (groups[bestIdx]?.months[0] ?? active) : active;
    },
    [groups, active]
  );

  const cursorFromEvent = (clientY: number) => {
    const cr = containerRef.current?.getBoundingClientRect();
    return cr ? clientY - cr.top : 0;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setCursorY(cursorFromEvent(e.clientY));
    onChange(valueFromY(e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setCursorY(cursorFromEvent(e.clientY));
    onChange(valueFromY(e.clientY));
  };

  const stopDragging = () => {
    setDragging(false);
    setCursorY(null);
  };

  return (
    <div ref={containerRef} className="relative mb-8 w-60 select-none pl-4">
      {/* 底衬面板：压住穿过数字的水波纹；无 backdrop-blur（背景层已有一层） */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-3 -inset-y-5 overflow-hidden rounded-xl border border-primary/[0.07] bg-white/80 shadow-[0_8px_30px_rgba(20,20,20,0.06)]"
      >
        {/* 描边水印年份：放在列表底部预留的 pb-14 空白区，不与文字重叠 */}
        <span
          key={activeYear}
          className="absolute bottom-1 right-2 leading-none font-medium text-transparent"
          style={{
            fontFamily: "var(--font-sigma), 'Noto Serif SC', serif",
            fontSize: 56,
            WebkitTextStroke: "1px rgba(20,20,20,0.10)",
            animation: "tl-rise-in 500ms cubic-bezier(0.22,1,0.36,1) both",
          }}
        >
          {activeYear}
        </span>
      </div>

      {/* 拖拽游标：跟随指针，松手后消失、激活态吸附到最近年份 */}
      {dragging && cursorY !== null && (
        <span
          aria-hidden
          className="absolute left-0 z-20 h-[2px] w-[14px] -translate-y-1/2 rounded-full bg-primary pointer-events-none"
          style={{ top: cursorY }}
        />
      )}

      {/* Drag hit area：与左内边距等宽，压在年份列表之上但不吞按钮点击 */}
      <div
        className="absolute left-0 top-0 bottom-0 z-20 w-4 touch-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
        onPointerCancel={stopDragging}
      />

      {/* pb-14 给水印留出专属空白区 */}
      <div className="relative flex flex-col gap-7 pb-14">
        {groups.map((g, gi) => {
          const isActiveYear = g.year === activeYear;
          return (
            <div
              key={g.year}
              ref={(el) => {
                rowRefs.current[gi] = el;
              }}
              className="group relative"
            >
              {/* Year label + month count */}
              <button
                onClick={() => g.months[0] && onChange(g.months[0])}
                aria-current={isActiveYear ? "true" : undefined}
                className="flex items-baseline gap-2 text-left"
                style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', serif" }}
              >
                <span
                  className={`leading-none tracking-tight transition-all duration-300 ${
                    isActiveYear
                      ? "text-[30px] font-medium text-primary"
                      : "text-lg text-primary/45 group-hover:translate-x-0.5 group-hover:text-primary"
                  }`}
                >
                  {g.year}
                </span>
                <span
                  className={`text-[9px] tracking-[0.2em] transition-opacity duration-300 ${
                    isActiveYear ? "text-outline opacity-100" : "text-outline opacity-0 group-hover:opacity-70"
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  ×{String(g.months.length).padStart(2, "0")}
                </span>
              </button>

              {/* Months：固定 4 列，多出换行；激活切换时重挂载以播放交错入场 */}
              <div
                key={isActiveYear ? `${g.year}-on` : `${g.year}-off`}
                className={`grid grid-cols-4 transition-all duration-300 ${
                  isActiveYear ? "mt-3 gap-x-1 gap-y-1.5" : "mt-2 gap-x-2.5 gap-y-1"
                }`}
                style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}
              >
                {g.months.map((m, mi) => {
                  const isActive = m === active;
                  return (
                    <button
                      key={m}
                      onClick={() => onChange(m)}
                      aria-current={isActive ? "date" : undefined}
                      style={
                        isActiveYear
                          ? { animation: `tl-rise-in 360ms ${mi * 30}ms cubic-bezier(0.22,1,0.36,1) both` }
                          : undefined
                      }
                      className={`rounded-full leading-none tabular-nums transition-all duration-200 ${
                        isActive
                          ? "bg-primary px-2.5 py-[5px] text-[10px] font-bold tracking-widest text-white shadow-[0_3px_10px_rgba(20,20,20,0.25)]"
                          : isActiveYear
                            ? "px-2.5 py-[5px] text-[10px] tracking-widest text-on-surface-variant hover:bg-primary/[0.06] hover:text-primary"
                            : "px-0 py-[2px] text-[9px] tracking-wider text-outline/70 hover:text-primary"
                      }`}
                    >
                      {m.slice(5)}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GallerySection({
  initialPhotos,
  initialTotal,
  initialYears = [],
}: {
  initialPhotos: Photo[];
  initialTotal: number;
  initialYears?: string[];
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [total, setTotal] = useState(initialTotal);
  const yearOf = (p: Photo) => (p.shoot_time ? p.shoot_time.slice(0, 7) : "");
  const allYears = initialYears.length > 0 ? initialYears : [...new Set(initialPhotos.map(yearOf).filter(Boolean))].sort().reverse();
  const [activeYear, setActiveYear] = useState<string>(allYears[0] ?? "");
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [colCount, setColCount] = useState(3); // 首帧与 SSR 一致，挂载后按窗口宽度调整

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      const n = w >= 1536 ? 5 : w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1;
      setColCount(n);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  const gridRef = useRef<HTMLDivElement>(null);
  const photosRef = useRef(photos);

  const years = allYears;

  const hasMore = photos.length < total;
  const hasMoreRef = useRef(hasMore);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 无限滚动的 IntersectionObserver 回调要读最新值，因此在提交后同步，而不是 render 期写 ref
  useEffect(() => {
    photosRef.current = photos;
    hasMoreRef.current = hasMore;
  });

  const loadingRef = useRef(false);

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (loadingRef.current) return false;
    loadingRef.current = true;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/photos?published_only=true&skip=${photosRef.current.length}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      setPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const merged = [...prev, ...data.items.filter((p: Photo) => !seen.has(p.id))];
        photosRef.current = merged;
        return merged;
      });
      setTotal(data.total);
      return data.items.length > 0;
    } catch {
      return false;
    } finally {
      loadingRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  const jumpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 程序化跳转期间抑制滚动联动，避免激活态沿滚动路径乱跳；滚动静默后恢复
  const spyHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spyHoldRef = useRef(false);
  const jumpToYear = useCallback((year: string) => {
    setActiveYear(year);
    spyHoldRef.current = true;
    if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
    jumpTimerRef.current = setTimeout(async () => {
      const target = () =>
        gridRef.current?.querySelector(`[data-year="${year}"]`) as HTMLElement | null;
      let el = target();
      while (!el && hasMore) {
        const ok = await loadMore();
        if (!ok) break;
        el = target();
      }
      spyHoldRef.current = true;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [hasMore, loadMore]);

  useEffect(() => {
    return () => {
      if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
      if (spyHoldTimerRef.current) clearTimeout(spyHoldTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreRef.current) loadMore();
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // 滚动监听：时间线跟随浏览位置，取阈值线以下第一张照片的月份（DOM 序即日期降序）
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (spyHoldRef.current) {
          // 程序化滚动进行中：保持目标年月，滚动静默 400ms 后恢复联动
          if (spyHoldTimerRef.current) clearTimeout(spyHoldTimerRef.current);
          spyHoldTimerRef.current = setTimeout(() => {
            spyHoldRef.current = false;
          }, 400);
          return;
        }
        const grid = gridRef.current;
        if (!grid) return;
        for (const el of grid.querySelectorAll("[data-year]")) {
          if (el.getBoundingClientRect().bottom > 180) {
            const y = el.getAttribute("data-year");
            if (y) setActiveYear((prev) => (prev === y ? prev : y));
            break;
          }
        }
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <span className="text-label-caps text-outline">SORTED BY SHOOT DATE</span>
      </div>

      <div className="flex flex-col md:flex-row md:gap-12 md:items-start">
        {/* 桌面端：左侧竖向时间线 */}
        <div className="hidden md:block flex-shrink-0 md:sticky md:top-28 md:pt-2">
          <DraggableTimeline entries={years} active={activeYear} onChange={jumpToYear} />
        </div>

        <div className="flex-1 min-w-0">
          {/* 移动端：横向月份快捷条 */}
          {years.length > 0 && (
            <div className="md:hidden -mx-4 mb-4 border-y border-primary/10">
              <div className="flex items-stretch overflow-x-auto px-2" style={{ scrollbarWidth: "none" }}>
                {years.map((y) => {
                  const isActive = activeYear === y;
                  return (
                    <button
                      key={y}
                      onClick={() => jumpToYear(y)}
                      className="relative flex flex-col items-center flex-shrink-0 px-4 py-3"
                      style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}
                    >
                      <span
                        className={`text-sm leading-none tracking-wider transition-colors ${
                          isActive ? "text-primary font-bold" : "text-outline"
                        }`}
                      >
                        {y.slice(5, 7)}
                      </span>
                      <span
                        className={`mt-1.5 text-[9px] leading-none transition-colors ${
                          isActive ? "text-primary/70" : "text-outline/60"
                        }`}
                      >
                        {y.slice(0, 4)}
                      </span>
                      <span
                        className={`absolute left-3 right-3 bottom-0 h-[2px] rounded-full transition-all duration-300 ${
                          isActive ? "bg-mint-accent opacity-100" : "opacity-0"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4">photo_library</span>
              <p className="text-headline-mobile text-on-surface-variant mb-2">No photos yet</p>
            </div>
          ) : (
            <>
              {/* flex 多列瀑布流（不用 CSS columns，避免阴影被碎片裁剪） */}
              <div
                ref={gridRef}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6"
              >
                {(() => {
                  const columns: Photo[][] = Array.from({ length: colCount }, () => []);
                  photos.forEach((p, i) => columns[i % colCount].push(p));
                  return columns.map((col, c) => (
                    <Reveal
                      key={c}
                      delay={(c % 3) * 80}
                      amount={0}
                      className="flex flex-col gap-6 min-w-0"
                    >
                      {col.map((photo) => {
                        const idx = photos.indexOf(photo);
                        const year = yearOf(photo);
                        return (
                          <button
                            key={photo.id}
                            data-year={year}
                            onClick={() => setLightboxIndex(idx)}
                            className="group relative overflow-hidden rounded-lg border border-border-subtle bg-surface block w-full shadow-[0_6px_14px_rgba(0,0,0,0.30),0_22px_52px_rgba(0,0,0,0.38)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_14px_32px_rgba(0,0,0,0.44),0_44px_88px_rgba(0,0,0,0.50)] scroll-mt-40 text-left cursor-pointer"
                          >
                            <div
                              className="relative w-full overflow-hidden rounded-lg bg-surface-dim"
                              style={{
                                aspectRatio: photo.image_width && photo.image_height
                                  ? `${photo.image_width} / ${photo.image_height}`
                                  : "4 / 3",
                              }}
                            >
                              <img
                                src={getPhotoImageUrl(photo.id, true)}
                                alt={photo.title}
                                className="absolute inset-0 w-full h-full object-cover transition-all duration-700 ease-out"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-primary/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4 pb-2">
                                <span className="text-label-caps text-white text-[10px]">CAPTURE DATE</span>
                                <span className="text-metadata-sm text-white text-[11px]">
                                  {formatDate(photo.shoot_time)}
                                  {photo.shoot_time && ` // ${formatTime(photo.shoot_time)}`}
                                </span>
                                <div className="mt-3 border-t border-white/20 pt-3 flex justify-between items-center">
                                  <span className="text-[16px] font-medium text-white leading-tight">{photo.title || "Untitled"}</span>
                                  <span className="material-symbols-outlined text-white text-[18px]">open_in_full</span>
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </Reveal>
                  ));
                })()}
              </div>

              <div ref={sentinelRef} className="flex items-center justify-center gap-2 mt-12 py-2">
                {loadingMore && <Spinner size="sm" />}
                <span className="text-label-caps text-outline">
                  {loadingMore ? "加载中..." : hasMore ? "继续滚动加载更多" : `已加载全部 ${total} 张`}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
