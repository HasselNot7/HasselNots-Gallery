"use client";

import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { getPhotoImageUrl } from "@/lib/api-server";

interface LightboxPhoto {
  id: number;
  title: string;
  shoot_time: string | null;
  camera_model: string;
}

export default function Lightbox({
  photos,
  index,
  onClose,
  onNavigate,
}: {
  photos: LightboxPhoto[];
  index: number;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}) {
  const photo = photos[index];

  const prev = useCallback(() => {
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const next = useCallback(() => {
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  if (!photo) return null;

  const dateStr = photo.shoot_time
    ? new Date(photo.shoot_time).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] bg-white/40 backdrop-blur-2xl flex flex-col"
      onClick={onClose}
    >
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 text-primary">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-metadata-sm text-primary/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {index + 1} / {photos.length}
          </span>
          <span className="text-body-md text-primary truncate">{photo.title}</span>
          {dateStr && (
            <span className="text-metadata-sm text-primary/60 hidden md:inline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {dateStr}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors rounded-md"
          aria-label="Close"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </div>

      {/* 图片区 */}
      <div className="flex-1 relative flex items-center justify-center px-4 md:px-16 pb-4 min-h-0">
        <img
          key={photo.id}
          src={getPhotoImageUrl(photo.id)}
          alt={photo.title}
          className="max-w-full max-h-full object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
        {photo.camera_model && (
          <span className="absolute bottom-2 right-4 text-metadata-sm text-primary/60" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {photo.camera_model}
          </span>
        )}
      </div>

      {/* 查看详情入口 */}
      <div className="flex justify-center pb-6">
        <a
          href={`/photo/${photo.id}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-2 text-label-caps px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          View Details
        </a>
      </div>

      {/* 左右箭头 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
        className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors rounded-full"
        aria-label="Previous"
      >
        <span className="material-symbols-outlined text-[28px]">chevron_left</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
        className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-primary hover:bg-primary/10 transition-colors rounded-full"
        aria-label="Next"
      >
        <span className="material-symbols-outlined text-[28px]">chevron_right</span>
      </button>
    </div>,
    document.body
  );
}
