"use client";

import { Modal, useOverlayState } from "@heroui/react";

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
      <button
        type="button"
        onClick={state.open}
        aria-label={alt}
        className="block w-full cursor-zoom-in text-left appearance-none border-0 bg-transparent p-0"
      >
        {children}
      </button>
      <Modal.Backdrop isOpen={state.isOpen} onOpenChange={state.setOpen} variant="blur">
        {/* Dialog 默认 bg-overlay（浅色主题里是纯白），full 尺寸会铺满整屏把暗色背层盖掉，
            所以这里要显式透明；图片也别加投影，落在白底上会糊成一条灰带 */}
        <Modal.Container size="full">
          {/* full 尺寸下 Dialog 铺满整屏，HeroUI 的「点背层关闭」收不到事件，移动端又只有 Esc 可退
              ——所以点 Dialog 空白处直接关，点图片本身不关 */}
          <Modal.Dialog className="flex flex-col bg-transparent shadow-none" onClick={state.close}>
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
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </Modal.Body>
            <div className="pb-4 text-center text-metadata-sm text-primary-fixed/60" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
              {alt} — 点空白处或按 ESC 关闭
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
