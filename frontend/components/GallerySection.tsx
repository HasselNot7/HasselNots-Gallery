"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Photo, getPhotoImageUrl } from "@/lib/api-server";
import Lightbox from "@/components/Lightbox";

const PAGE_SIZE = 12;

function DraggableTimeline({ entries, active, onChange }: { entries: string[]; active: string; onChange: (y: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const groups = useMemo(() => {
    const years = [...new Set(entries.map((e) => e.slice(0, 4)))];
    return years.map((y) => ({ year: y, months: entries.filter((e) => e.startsWith(`${y}-`)) }));
  }, [entries]);

  const activeYear = active.slice(0, 4);

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

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    onChange(valueFromY(e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    onChange(valueFromY(e.clientY));
  };

  const stopDragging = () => setDragging(false);

  return (
    <div className="relative mb-8 select-none">
      {/* Vertical guide line */}
      <div className="absolute left-[5px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-primary/20 pointer-events-none" />

      {/* Drag hit area over the line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-8 touch-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
        onPointerCancel={stopDragging}
      />

      <div className="flex flex-col gap-9">
        {groups.map((g, gi) => {
          const isActiveYear = g.year === activeYear;
          return (
            <div
              key={g.year}
              ref={(el) => {
                rowRefs.current[gi] = el;
              }}
              className="relative flex items-start gap-4"
            >
              {/* Node dot on the line */}
              <span className="relative z-10 mt-2 flex h-3 w-3 flex-shrink-0 items-center justify-center">
                <span
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: isActiveYear ? 8 : 5,
                    height: isActiveYear ? 8 : 5,
                    background: isActiveYear ? "#141414" : "#ffffff",
                    border: "1px solid rgba(20,20,20,0.4)",
                  }}
                />
              </span>

              <div className="min-w-0 -mt-0.5">
                {/* Year label */}
                <button
                  onClick={() => g.months[0] && onChange(g.months[0])}
                  className={`block text-left text-xl font-bold leading-none tracking-tight transition-colors ${
                    isActiveYear ? "text-primary" : "text-primary/45 hover:text-primary/80"
                  }`}
                  style={{ fontFamily: "'Sigma Serif', 'Noto Serif SC', serif" }}
                >
                  {g.year}
                </button>

                {/* Months as a typographic row */}
                <div
                  className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-2"
                  style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}
                >
                  {g.months.map((m) => {
                    const isActive = m === active;
                    return (
                      <button
                        key={m}
                        onClick={() => onChange(m)}
                        className={`relative pb-1 text-[11px] leading-none tracking-wider transition-colors ${
                          isActive ? "text-primary font-bold" : "text-outline hover:text-primary"
                        }`}
                      >
                        {m.slice(5)}
                        <span
                          className={`absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full transition-all duration-300 ${
                            isActive ? "bg-mint-accent opacity-100" : "bg-primary/40 opacity-0"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
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
  photosRef.current = photos;

  const years = allYears;

  const hasMore = photos.length < total;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const sentinelRef = useRef<HTMLDivElement>(null);

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
  const jumpToYear = useCallback((year: string) => {
    setActiveYear(year);
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
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [hasMore, loadMore]);

  useEffect(() => {
    return () => {
      if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current);
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

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <span className="text-label-caps text-outline">SORTED BY SHOOT DATE</span>
      </div>

      <div className="flex flex-col md:flex-row md:gap-8 md:items-start">
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
                    <div key={c} className="flex flex-col gap-6 min-w-0">
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
                    </div>
                  ));
                })()}
              </div>

              <div ref={sentinelRef} className="flex justify-center mt-12 py-2">
                <span className="text-label-caps text-outline">
                  {loadingMore ? "Loading..." : hasMore ? "Scroll for more" : `All ${total} photos loaded`}
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
