"use client";

import { useEffect, useCallback, useRef } from "react";
import { Button, Modal, useOverlayState } from "@heroui/react";
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
  const state = useOverlayState({ isOpen: !!photo, onOpenChange: (open) => { if (!open) onClose(); } });

  const prev = useCallback(() => {
    onNavigate((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onNavigate]);

  const next = useCallback(() => {
    onNavigate((index + 1) % photos.length);
  }, [index, photos.length, onNavigate]);

  // 移动端左右滑动切换 / Mobile swipe navigation
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        e.stopPropagation();
        if (dx < 0) next();
        else prev();
      }
    },
    [next, prev]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  if (!photo) return null;

  const dateStr = photo.shoot_time
    ? new Date(photo.shoot_time).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    // variant 取 transparent 而非 blur：opaque 与 blur 都会带上 bg-backdrop，
    // 会和自定义的 bg-white/40 抢背景色；透明变体让 className 成为唯一来源。
    <Modal.Backdrop
      variant="transparent"
      isOpen={state.isOpen}
      onOpenChange={state.setOpen}
      className="bg-white/40 backdrop-blur-2xl"
    >
      <Modal.Container size="full">
        {/* .modal__dialog 自带 bg-overlay（不透明）与 p-6，会把背后模糊层完全盖住；
            size="full" 只重置了圆角与阴影，背景与内边距必须在这里显式清掉。 */}
        <Modal.Dialog
          className="flex h-full flex-col rounded-none bg-transparent p-0 shadow-none"
          onClick={onClose}
        >
          {/* 顶栏 */}
          <div className="flex items-center justify-between px-4 md:px-8 py-4 text-primary">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-metadata-sm text-primary/60" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                {index + 1} / {photos.length}
              </span>
              <span className="text-body-md text-primary truncate">{photo.title}</span>
              {dateStr && (
                <span className="text-metadata-sm text-primary/60 hidden md:inline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
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
          <Modal.Body
            className="relative flex flex-1 items-center justify-center px-4 md:px-16 pb-4 min-h-0"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <img
              key={photo.id}
              src={getPhotoImageUrl(photo.id)}
              alt={photo.title}
              className="max-w-full max-h-full object-contain ring-1 ring-black/10 shadow-sm"
              onClick={(e) => e.stopPropagation()}
            />
            {photo.camera_model && (
              <span className="absolute bottom-2 right-4 text-metadata-sm text-white/90 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                {photo.camera_model}
              </span>
            )}

            {/* 包裹层负责定位与阻止冒泡，HeroUI Button 只承担动作，
                避免在同一元素上混用 onClick 与 onPress。 */}
            <div
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                isIconOnly
                variant="ghost"
                className="w-full h-full rounded-full text-primary [--button-bg:transparent] hover:[--button-bg-hover:color-mix(in_oklab,var(--color-primary)_10%,transparent)]"
                onPress={prev}
                aria-label="Previous"
              >
                <span className="material-symbols-outlined text-[28px]">chevron_left</span>
              </Button>
            </div>
            <div
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                isIconOnly
                variant="ghost"
                className="w-full h-full rounded-full text-primary [--button-bg:transparent] hover:[--button-bg-hover:color-mix(in_oklab,var(--color-primary)_10%,transparent)]"
                onPress={next}
                aria-label="Next"
              >
                <span className="material-symbols-outlined text-[28px]">chevron_right</span>
              </Button>
            </div>
          </Modal.Body>

          {/* 查看详情入口 */}
          <Modal.Footer className="justify-center pb-6">
            <a
              href={`/photo/${photo.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-2 text-label-caps px-6 py-3 bg-primary text-white rounded-md hover:bg-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              View Details
            </a>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
