"use client";

// Source: React Bits (MIT) — src/content/TextAnimations/CountUp/CountUp.jsx
// 精简：去掉 direction / startWhen / onStart / onEnd 与演示 props。
// 改动两处以适配 SSR：首屏由 React 渲染终值（无 JS 也可读、不闪回），
// 起始值改到「进入视口、动画即将开始」那一刻才写入，避免挂载时先把数字打回 0。
import { useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

function decimalPlaces(num: number) {
  const str = String(num);
  if (!str.includes(".")) return 0;
  const decimals = str.split(".")[1];
  return parseInt(decimals, 10) === 0 ? decimals.length : 0;
}

export default function CountUp({
  to,
  from = 0,
  duration = 2,
  delay = 0,
  separator = "",
  className = "",
}: {
  to: number;
  /** 起始值；默认 0，需要「从旧值滚到新值」时传入旧值 */
  from?: number;
  duration?: number;
  delay?: number;
  separator?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(from);
  const springValue = useSpring(motionValue, {
    damping: 20 + 40 * (1 / duration),
    stiffness: 100 * (1 / duration),
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const maxDecimals = Math.max(decimalPlaces(from), decimalPlaces(to));

  const formatValue = useCallback(
    (latest: number) => {
      const hasDecimals = maxDecimals > 0;
      const options = {
        useGrouping: Boolean(separator),
        minimumFractionDigits: hasDecimals ? maxDecimals : 0,
        maximumFractionDigits: hasDecimals ? maxDecimals : 0,
      };
      const formatted = Intl.NumberFormat("en-US", options).format(latest);
      return separator ? formatted.replace(/,/g, separator) : formatted;
    },
    [maxDecimals, separator]
  );

  // 首帧文本：服务端与客户端一致，且此后由动画独占 textContent，React 不再参与协调
  const [initialText] = useState(() => formatValue(to));
  const live = Boolean(reduced);

  useEffect(() => {
    if (live || !isInView) return;
    if (ref.current) ref.current.textContent = formatValue(from);
    const timer = setTimeout(() => motionValue.set(to), delay * 1000);
    return () => clearTimeout(timer);
  }, [live, isInView, motionValue, from, to, delay, formatValue]);

  useEffect(() => {
    if (live) return;
    return springValue.on("change", (latest) => {
      if (ref.current) ref.current.textContent = formatValue(latest);
    });
  }, [springValue, live, formatValue]);

  return <span ref={ref} className={className}>{live ? formatValue(to) : initialText}</span>;
}
