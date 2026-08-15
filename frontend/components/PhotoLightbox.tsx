"use client";

import { useEffect, useState } from "react";

/** 详情页大图灯箱：点击图片全屏查看，Esc/点击关闭，滚动缩放提示。 */
export default function PhotoLightbox({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button onClick={() => setOpen(true)} className="block w-full cursor-zoom-in text-left">
        {children}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[1000] bg-primary/95 backdrop-blur-md flex flex-col"
          onClick={() => setOpen(false)}
        >
          <div className="flex items-center justify-end px-4 md:px-8 py-4">
            <span className="material-symbols-outlined text-primary-fixed w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-primary-fixed/10 transition-colors rounded-md">
              close
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 pb-6 min-h-0">
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="pb-4 text-center text-metadata-sm text-primary-fixed/60" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
            {alt} — press ESC to close
          </div>
        </div>
      )}
    </>
  );
}
