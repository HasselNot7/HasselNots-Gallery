"use client";

import { Button, Modal, useOverlayState } from "@heroui/react";

/** 详情页大图灯箱：点击图片全屏查看，Esc/点击关闭。 */
export default function PhotoLightbox({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
}) {
  const state = useOverlayState();

  return (
    <>
      <Button slot="trigger" onPress={state.open} className="block w-full cursor-zoom-in text-left">
        {children}
      </Button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen} variant="blur" className="bg-primary/95">
        <Modal.Container size="full">
          <Modal.Dialog className="flex flex-col">
            <div className="flex items-center justify-end px-4 md:px-8 py-4">
              <Modal.CloseTrigger
                aria-label="关闭"
                className="text-primary-fixed hover:bg-primary-fixed/10"
              />
            </div>
            <Modal.Body className="flex items-center justify-center px-4 pb-6 min-h-0">
              <img
                src={src}
                alt={alt}
                className="max-w-full max-h-full object-contain shadow-2xl"
              />
            </Modal.Body>
            <div className="pb-4 text-center text-metadata-sm text-primary-fixed/60" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
              {alt} — 按 ESC 关闭
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
