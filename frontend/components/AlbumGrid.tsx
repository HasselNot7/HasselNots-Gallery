"use client";

import { useEffect, useState } from "react";
import { getPhotoImageUrl, Photo } from "@/lib/api-server";

export default function AlbumGrid({ photos }: { photos: Photo[] }) {
  const [colCount, setColCount] = useState(3); // 首帧与 SSR 一致，挂载后按窗口宽度调整

  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      setColCount(w >= 1280 ? 4 : w >= 1024 ? 3 : w >= 640 ? 2 : 1);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const columns: Photo[][] = Array.from({ length: colCount }, () => []);
  photos.forEach((p, i) => columns[i % colCount].push(p));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {columns.map((col, c) => (
        <div key={c} className="flex flex-col gap-6 min-w-0">
          {col.map((photo) => (
            <a
              key={photo.id}
              href={`/photo/${photo.id}`}
              className="group relative overflow-hidden rounded-lg border border-border-subtle bg-surface block w-full shadow-[0_6px_14px_rgba(0,0,0,0.30),0_22px_52px_rgba(0,0,0,0.38)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_14px_32px_rgba(0,0,0,0.44),0_44px_88px_rgba(0,0,0,0.50)]"
            >
              <div
                className="relative w-full overflow-hidden bg-surface-dim"
                style={{
                  aspectRatio: photo.image_width && photo.image_height
                    ? `${photo.image_width} / ${photo.image_height}`
                    : "4 / 3",
                }}
              >
                <img
                  src={getPhotoImageUrl(photo.id, true)}
                  alt={photo.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <span className="text-body-md text-white font-medium truncate block">{photo.title || "Untitled"}</span>
              </div>
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}
