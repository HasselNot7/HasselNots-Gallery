"use client";

// Reveal — 本项目自写，不来自 React Bits（FadeContent 依赖 gsap，故未采用）
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "./Reveal.css";

type RevealTag = "div" | "section" | "article" | "li" | "span" | "figure";

export default function Reveal({
  children,
  delay = 0,
  y = 16,
  blur = false,
  amount = 0.2,
  as = "div",
  className = "",
}: {
  children: ReactNode;
  /** 错峰延迟，毫秒 */
  delay?: number;
  /** 初始纵向位移，像素 */
  y?: number;
  blur?: boolean;
  /** 可见比例阈值；容器远高于视口时需传 0，否则阈值永远达不到 */
  amount?: number;
  as?: RevealTag;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount, margin: "0px" });
  const [belowFold, setBelowFold] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // 只有确认在首屏折线之下才允许隐藏：内容默认随 SSR 直接呈现，
    // 不把可读性与 LCP 押后到水合与 IntersectionObserver 之后。
    if (!reduced && el.getBoundingClientRect().top >= window.innerHeight) {
      setBelowFold(true);
    }
  }, [reduced]);

  const Comp = as as "div";
  const hidden = belowFold && !inView;

  return (
    <Comp
      ref={ref}
      className={`rb-reveal ${className}`.trim()}
      data-reveal={hidden ? "out" : "in"}
      data-blur={blur ? "1" : undefined}
      style={
        {
          "--rb-reveal-delay": `${delay}ms`,
          "--rb-reveal-y": `${y}px`,
        } as CSSProperties
      }
    >
      {children}
    </Comp>
  );
}
