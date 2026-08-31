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
    <Modal.Backdrop variant="blur" isOpen={state.isOpen} onOpenChange={state.setOpen} className="bg-white/40 backdrop-blur-2xl">
      <Modal.Container size="full">
        <Modal.Dialog className="flex flex-col">
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
            <Modal.CloseTrigger aria-label="关闭" />
          </div>

          <Modal.Body
            className="relative flex flex-1 items-center justify-center px-4 md:px-16 pb-4 min-h-0"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <img
              key={photo.id}
              src={getPhotoImageUrl(photo.id)}
              alt={photo.title}
              className="max-w-full max-h-full object-contain shadow-2xl"
            />
            {photo.camera_model && (
              <span className="absolute bottom-2 right-4 text-metadata-sm text-white/90 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-md" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                {photo.camera_model}
              </span>
            )}

            <Button
              isIconOnly
              variant="ghost"
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full"
              onPress={prev}
              aria-label="上一张"
            >
              <span className="material-symbols-outlined text-[28px]">chevron_left</span>
            </Button>
            <Button
              isIconOnly
              variant="ghost"
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full"
              onPress={next}
              aria-label="下一张"
            >
              <span className="material-symbols-outlined text-[28px]">chevron_right</span>
            </Button>
          </Modal.Body>

          <Modal.Footer className="justify-center pb-6">
            <a
              href={`/photo/${photo.id}`}
              className="inline-flex items-center gap-2 text-label-caps px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-container transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              查看详情
            </a>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
