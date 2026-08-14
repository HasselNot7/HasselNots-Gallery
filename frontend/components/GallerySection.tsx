"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Photo, getPhotoImageUrl } from "@/lib/api-server";
import Lightbox from "@/components/Lightbox";

const PAGE_SIZE = 12;

function DraggableTimeline({ entries, active, onChange }: { entries: string[]; active: string; onChange: (y: string) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const entriesList = entries;

  const valueFromY = useCallback(
    (clientY: number) => {
      const rail = railRef.current;
      if (!rail) return active;
      const rect = rail.getBoundingClientRect();
      const ratio = (clientY - rect.top) / rect.height;
      const idx = Math.round(ratio * (entriesList.length - 1));
      return entriesList[Math.max(0, Math.min(entriesList.length - 1, idx))];
    },
    [entriesList, active]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    onChange(valueFromY(e.clientY));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    onChange(valueFromY(e.clientY));
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const activeIdx = entriesList.indexOf(active);
  const activePos = entriesList.length > 1 ? (activeIdx / (entriesList.length - 1)) * 100 : 50;

  return (
    <div className="flex items-center gap-3 md:gap-4 mb-8 select-none">
      {/* Year label */}
      <div className="w-12 md:w-16 text-right flex-shrink-0 flex flex-col items-end gap-1.5">
        <span
          className="text-label-caps text-primary leading-none"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {active || "—"}
        </span>
        <span
          className="text-[8px] text-outline uppercase tracking-widest leading-none"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          Year
        </span>
      </div>

      {/* Touch zone (wide hit area around the thin rail) */}
      <div
        className="relative flex items-center justify-center w-10 h-56 md:h-72 -mx-2 touch-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Vertical rail */}
        <div
          ref={railRef}
          className="relative w-1.5 h-full bg-surface-container-high border border-primary/15 rounded-full overflow-visible"
        >
          {/* Progress fill above the active thumb */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-full rounded-full bg-gradient-to-b from-mint-accent via-primary/50 to-primary/40 pointer-events-none"
            style={{ height: `${activePos}%`, boxShadow: "0 0 6px rgba(45,79,62,0.25)" }}
          />

          {/* Node dots */}
          {entriesList.map((entry, i) => {
            const isActive = i === activeIdx;
            const y = entriesList.length > 1 ? (i / (entriesList.length - 1)) * 100 : 50;
            return (
              <span
                key={entry}
                className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 pointer-events-none"
                style={{
                  top: `${y}%`,
                  width: isActive ? 18 : 9,
                  height: isActive ? 18 : 9,
                  background: isActive ? "#163828" : "#f8faf8",
                  border: isActive ? "2px solid #c5ebd4" : "1px solid rgba(45,79,62,0.35)",
                  boxShadow: isActive
                    ? "0 0 0 4px rgba(209,231,211,0.65), 0 2px 8px rgba(22,56,40,0.3)"
                    : "0 1px 3px rgba(22,56,40,0.15)",
                }}
              />
            );
          })}

          {/* Draggable thumb */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-primary border-2 border-primary-fixed pointer-events-none transition-[top] duration-100"
            style={{
              top: `${activePos}%`,
              boxShadow: "0 0 0 3px rgba(209,231,211,0.45), 0 4px 12px rgba(22,56,40,0.35)",
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-primary-fixed" />
            </div>
            {/* Subtle pulse ring */}
            <div className="absolute inset-0 rounded-full border border-mint-accent/50 animate-ping pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Year list on the right (desktop only) */}
      <div className="hidden md:flex flex-col justify-between h-56 md:h-72 text-[10px] py-1.5 pl-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {entriesList.map((entry, i) => (
          <span
            key={entry}
            className={`leading-none transition-all duration-200 cursor-pointer px-2 py-1 rounded-sm ${
              i === activeIdx
                ? "text-primary font-bold bg-mint-accent/40 shadow-sm"
                : "text-outline hover:text-primary"
            }`}
            style={{
              border: i === activeIdx ? "1px solid rgba(209,231,211,0.9)" : "1px solid transparent",
            }}
            onClick={() => onChange(entry)}
          >
            {entry}
          </span>
        ))}
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
}: {
  initialPhotos: Photo[];
  initialTotal: number;
}) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [total, setTotal] = useState(initialTotal);
  const yearOf = (p: Photo) => (p.shoot_time ? String(new Date(p.shoot_time).getFullYear()) : "");
  const initialYears = [...new Set(initialPhotos.map(yearOf).filter(Boolean))].sort().reverse();
  const [activeYear, setActiveYear] = useState<string>(initialYears[0] ?? "");
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

  const years = [...new Set(photos.map(yearOf).filter(Boolean))].sort().reverse() as string[];

  const hasMore = photos.length < total;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async (): Promise<boolean> => {
    if (loadingMore) return false;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/photos?published_only=true&skip=${photosRef.current.length}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      setPhotos((prev) => {
        const merged = [...prev, ...data.items];
        photosRef.current = merged;
        return merged;
      });
      setTotal(data.total);
      return data.items.length > 0;
    } catch {
      return false;
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore]);

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
        <div className="flex-shrink-0 md:sticky md:top-28 md:pt-2">
          <DraggableTimeline entries={years} active={activeYear} onChange={jumpToYear} />
        </div>

        <div className="flex-1 min-w-0">
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
                  const columns: typeof photos[][] = Array.from({ length: colCount }, () => []);
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
                              <div className="absolute inset-0 bg-primary/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                                <span className="text-label-caps text-white text-[10px]">CAPTURE DATE</span>
                                <span className="text-metadata-sm text-mint-accent text-[11px]">
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
