"use client";

import { useEffect, useState } from "react";
import { Chip, ProgressBar } from "@heroui/react";
import { EquipmentStat } from "@/lib/api-server";

const MONO = "'JetBrains Mono', 'Noto Serif SC', monospace";

/**
 * HeroUI v3 没有图表组件（对照 node_modules/@heroui/react/dist/components 全表确认），
 * 所以图表自绘：SVG + 主题变量，容器/胶囊/进度条仍用 HeroUI。
 * 全站是黑白灰，配色就按扇区序号从深到浅排灰阶，不引入第三种颜色。
 */
export function tone(index: number, count: number): string {
  const lightness = count <= 1 ? 12 : 12 + (index * 62) / (count - 1);
  return `hsl(0 0% ${lightness.toFixed(1)}%)`;
}

/** 挂载后才给目标值，让柱子/环形有一次从 0 长出来的过渡 */
function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return mounted;
}

export function DonutChart({ data, unit = "张" }: { data: EquipmentStat[]; unit?: string }) {
  const entries = data.filter((d) => d.count > 0);
  const total = entries.reduce((sum, d) => sum + d.count, 0);
  const mounted = useMounted();
  if (!total) return null;

  const size = 168;
  const thickness = 20;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  // 每段的起点 = 它之前所有段占比之和。用 slice+reduce 现算而不是累加变量：
  // 渲染期改局部变量会被 react-hooks/immutability 判成「渲染后仍被改写的状态」。
  const segments = entries.map((d, i) => {
    const before = entries.slice(0, i).reduce((sum, x) => sum + x.count, 0) / total;
    const frac = d.count / total;
    return {
      key: d.name,
      // 段间留 2px 缝，否则相邻同色灰阶会糊成一整圈看不出分界
      dash: Math.max(frac * circumference - 2, 0.6),
      gap: circumference - Math.max(frac * circumference - 2, 0.6),
      offset: -before * circumference,
      color: tone(i, entries.length),
    };
  });

  return (
    <div className="flex items-center gap-5 max-md:flex-col max-md:gap-3">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`占比环形图，共 ${total} ${unit}`}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${mounted ? s.dash : 0} ${s.gap}`}
              strokeDashoffset={s.offset}
              style={{ transition: "stroke-dasharray 900ms ease-out" }}
            />
          ))}
        </g>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-primary"
          style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500 }}
        >
          {total}
        </text>
        <text
          x="50%"
          y="50%"
          dy={18}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-outline"
          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em" }}
        >
          {unit.toUpperCase()}
        </text>
      </svg>
      {/* 数值同时写成文字：读屏拿不到 SVG 的弧长 */}
      <ul className="flex-1 w-full space-y-1.5">
        {entries.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-body-md">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: tone(i, entries.length) }} />
            <span className="min-w-0 flex-1 truncate text-primary" title={d.name}>
              {d.name}
            </span>
            <span className="text-metadata-sm tabular-nums text-outline" style={{ fontFamily: MONO }}>
              {d.count} · {Math.round((d.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ColumnChart({
  data,
  height = 150,
  unit = "张",
}: {
  data: EquipmentStat[];
  height?: number;
  unit?: string;
}) {
  const max = Math.max(...data.map((d) => d.count), 1);
  const mounted = useMounted();
  return (
    <div>
      <div className="flex items-end gap-1.5 md:gap-2" style={{ height }}>
        {data.map((d) => (
          <div key={d.name} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
            <span
              className="text-metadata-sm tabular-nums text-outline"
              style={{ fontFamily: MONO, minHeight: 14 }}
            >
              {d.count > 0 ? d.count : ""}
            </span>
            <div
              className="w-full rounded-t-sm bg-primary"
              title={`${d.name}：${d.count} ${unit}`}
              style={{
                height: mounted ? `${(d.count / max) * 100}%` : "0%",
                minHeight: d.count > 0 ? 3 : 0,
                opacity: 0.55 + 0.45 * (d.count / max),
                transition: "height 800ms cubic-bezier(.22,1,.36,1)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5 border-t border-border-subtle pt-2 md:gap-2">
        {data.map((d) => (
          <span
            key={d.name}
            className="min-w-0 flex-1 break-words text-center text-[9px] leading-tight text-outline md:text-[10px]"
            style={{ fontFamily: MONO }}
            title={d.name}
          >
            {d.name}
          </span>
        ))}
      </div>
    </div>
  );
}

/** 器材卡里的小趋势线：viewBox 非等比缩放会把 stroke 拉粗，靠 non-scaling-stroke 顶住 */
export function Sparkline({ series }: { series: number[] }) {
  const max = Math.max(...series, 1);
  const step = series.length > 1 ? 100 / (series.length - 1) : 0;
  const points = series.map((v, i) => `${(i * step).toFixed(2)},${(28 - (v / max) * 24).toFixed(2)}`).join(" ");
  const last = series[series.length - 1] ?? 0;
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 flex-1" aria-hidden="true">
        <polygon points={`0,30 ${points} 100,30`} className="fill-primary" opacity="0.07" />
        <polyline
          points={points}
          fill="none"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          className="stroke-primary"
          opacity="0.7"
        />
      </svg>
      <span className="text-metadata-sm shrink-0 tabular-nums text-outline" style={{ fontFamily: MONO }}>
        近 12 月 · 本月 {last}
      </span>
    </div>
  );
}

export function BarRows({ items, max }: { items: EquipmentStat[]; max?: number }) {
  const peak = max ?? Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-3 md:gap-5">
          <span className="w-28 shrink-0 truncate text-body-md text-primary md:w-40" title={item.name}>
            {item.name}
          </span>
          <ProgressBar aria-label={item.name} value={(item.count / peak) * 100} className="flex-1">
            <ProgressBar.Track className="h-1">
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <span
            className="w-10 text-right text-metadata-sm tabular-nums text-outline shrink-0"
            style={{ fontFamily: MONO }}
          >
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-primary/15 pb-2">
      <h2 className="text-label-caps uppercase tracking-widest text-secondary">{children}</h2>
      {aside ? <span className="text-metadata-sm shrink-0 text-outline">{aside}</span> : null}
    </div>
  );
}

export function BrandChip({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <Chip size="sm" variant="soft">
      <Chip.Label>{children}</Chip.Label>
    </Chip>
  );
}
