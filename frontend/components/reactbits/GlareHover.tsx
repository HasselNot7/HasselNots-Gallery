// Source: React Bits (MIT) — src/content/Animations/GlareHover/GlareHover.jsx
// 精简：删去 width/height/background/borderColor/borderRadius/playOnce 等演示期 props，
// 掠光改为绝对定位覆盖层，尺寸跟随父容器；纯 CSS 驱动，无需 ref 与事件绑定。
import type { CSSProperties } from "react";
import "./GlareHover.css";

function toRgba(hex: string, opacity: number) {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function GlareHover({
  glareColor = "#ffffff",
  glareOpacity = 0.35,
  glareAngle = -45,
  glareSize = 250,
  transitionDuration = 650,
  className = "",
}: {
  glareColor?: string;
  glareOpacity?: number;
  /** 掠光方向，度 */
  glareAngle?: number;
  /** 光带尺寸，百分比 */
  glareSize?: number;
  transitionDuration?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`glare-hover ${className}`.trim()}
      style={
        {
          "--gh-angle": `${glareAngle}deg`,
          "--gh-duration": `${transitionDuration}ms`,
          "--gh-size": `${glareSize}%`,
          "--gh-rgba": toRgba(glareColor, glareOpacity),
        } as CSSProperties
      }
    />
  );
}
