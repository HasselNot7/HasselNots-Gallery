"use client";

import { Photo, getPhotoImageUrl } from "@/lib/api-server";

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

export default function PhotoGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant">
        <span className="material-symbols-outlined text-6xl mb-4">photo_library</span>
        <p className="text-headline-mobile text-on-surface-variant mb-2">No photos yet</p>
        <p className="text-metadata-sm text-outline uppercase">Upload your first image from the admin panel</p>
      </div>
    );
  }

  const getSpan = (idx: number) => ["md:col-span-8", "md:col-span-6", "md:col-span-10"][idx % 3];
  const getAspect = (idx: number) => ["aspect-[16/9]", "aspect-[4/5]", "aspect-[21/9]"][idx % 3];
  const getOffset = (idx: number) => {
    if (idx % 3 === 2) return "md:col-start-2";
    return "md:col-start-1";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {photos.map((photo, idx) => (
        <a
          key={photo.id}
          href={`/photo/${photo.id}`}
          className={`col-span-1 ${getSpan(idx)} ${getOffset(idx)} group relative overflow-hidden border border-border-subtle bg-surface`}
        >
          <div className={`${getAspect(idx)} w-full bg-surface-dim relative overflow-hidden`}>
            <img
              src={getPhotoImageUrl(photo.id, true)}
              alt={photo.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700 ease-out"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-primary/60 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-6">
              <span className="text-label-caps text-white">CAPTURE DATE</span>
              <span className="text-metadata-sm text-mint-accent">
                {formatDate(photo.shoot_time)}
                {photo.shoot_time && ` // ${formatTime(photo.shoot_time)}`}
              </span>
              <div className="mt-4 border-t border-white/20 pt-4 flex justify-between items-center">
                <span className="text-headline-mobile text-white">{photo.title || "Untitled"}</span>
                <span className="material-symbols-outlined text-white">arrow_outward</span>
              </div>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
