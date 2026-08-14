"use client";

import { useState, useCallback, useRef } from "react";
import { Photo, getPhotoImageUrl } from "@/lib/api-server";

const PAGE_SIZE = 12;

function DraggableTimeline({ years, active, onChange }: { years: number[]; active: string; onChange: (y: string) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const entries = ["all", ...years.map(String)];

  const valueFromY = useCallback(
    (clientY: number) => {
      const rail = railRef.current;
      if (!rail) return active;
      const rect = rail.getBoundingClientRect();
      const ratio = (clientY - rect.top) / rect.height;
      const idx = Math.round(ratio * (entries.length - 1));
      return entries[Math.max(0, Math.min(entries.length - 1, idx))];
    },
    [entries, active]
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

  const activeIdx = entries.indexOf(active);

  return (
    <div className="flex items-center gap-3 md:gap-4 mb-8 select-none">
      {/* Year label */}
      <div className="w-12 md:w-16 text-right flex-shrink-0">
        <span
          className={`text-label-caps transition-colors ${
            active === "all" ? "text-primary" : "text-on-surface-variant"
          }`}
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {active === "all" ? "ALL" : active}
        </span>
      </div>

      {/* Touch zone (wide hit area around the thin rail) */}
      <div
        className="relative flex items-center justify-center w-10 h-56 md:h-64 -mx-2 touch-none cursor-pointer"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Vertical rail */}
        <div
          ref={railRef}
          className="relative w-2 h-full bg-surface-container-high border border-primary/15 rounded-full"
        >
        {/* Node dots */}
        {entries.map((entry, i) => {
          const isActive = i === activeIdx;
          const y = entries.length > 1 ? (i / (entries.length - 1)) * 100 : 50;
          return (
            <span
              key={entry}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 pointer-events-none"
              style={{
                top: `${y}%`,
                width: isActive ? 14 : 8,
                height: isActive ? 14 : 8,
                background: isActive ? "#163828" : "#d8dad9",
                border: isActive ? "2px solid #c5ebd4" : "1px solid #727973",
              }}
            />
          );
        })}

        {/* Draggable thumb */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary border-2 border-primary-fixed shadow-lg pointer-events-none transition-[top] duration-100"
          style={{
            top: `${entries.length > 1 ? (activeIdx / (entries.length - 1)) * 100 : 50}%`,
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-fixed" />
          </div>
        </div>

        {/* Tick marks */}
        <div className="absolute -right-5 top-0 bottom-0 w-4 pointer-events-none flex flex-col justify-between">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={`w-3 h-px ${i % 2 === 0 ? "bg-primary/40" : "bg-primary/20"}`} />
          ))}
        </div>
        </div>
      </div>

      {/* Year list on the right (desktop only) */}
      <div className="hidden md:flex flex-col justify-between h-56 md:h-64 text-[10px] py-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
        {entries.map((entry, i) => (
          <span
            key={entry}
            className={`leading-none transition-colors cursor-pointer ${
              i === activeIdx ? "text-primary font-bold" : "text-outline"
            }`}
            onClick={() => onChange(entry)}
          >
            {entry === "all" ? "ALL" : entry}
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
  const [filter, setFilter] = useState("all");
  const [loadingMore, setLoadingMore] = useState(false);

  const years = [
    ...new Set(
      photos
        .map((p) => (p.shoot_time ? new Date(p.shoot_time).getFullYear() : null))
        .filter(Boolean)
    ),
  ].sort((a, b) => (b as number) - (a as number)) as number[];

  const filtered = filter === "all"
    ? photos
    : photos.filter((p) => p.shoot_time && new Date(p.shoot_time).getFullYear() === parseInt(filter));

  const hasMore = photos.length < total;

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/photos?published_only=true&skip=${photos.length}&limit=${PAGE_SIZE}`);
      const data = await res.json();
      setPhotos((prev) => [...prev, ...data.items]);
      setTotal(data.total);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  }, [photos.length]);

  return (
    <>
      <div className="flex items-center justify-end mb-6">
        <span className="text-label-caps text-outline">SORTED BY SHOOT DATE</span>
      </div>

      <div className="flex flex-col md:flex-row md:gap-8 md:items-start">
        <div className="flex-shrink-0 md:sticky md:top-28 md:pt-2">
          <DraggableTimeline years={years} active={filter} onChange={setFilter} />
        </div>

        <div className="flex-1 min-w-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4">photo_library</span>
              <p className="text-headline-mobile text-on-surface-variant mb-2">No photos in this period</p>
            </div>
          ) : (
            <>
              <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                {filtered.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/photo/${photo.id}`}
                    className="group relative overflow-hidden rounded-lg border border-border-subtle bg-surface block break-inside-avoid shadow-sm transition-shadow duration-500 ease-out hover:shadow-xl hover:shadow-primary/10"
                  >
                    <div className="relative overflow-hidden rounded-lg">
                      <img
                        src={getPhotoImageUrl(photo.id, true)}
                        alt={photo.title}
                        className="w-full h-auto object-cover transition-all duration-700 ease-out"
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
                          <span className="material-symbols-outlined text-white text-[18px]">arrow_outward</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center mt-12">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-label-caps px-8 py-3 border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all duration-300 disabled:opacity-50"
                  >
                    {loadingMore ? "Loading..." : `Load More (${photos.length} / ${total})`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
