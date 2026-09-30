import { Card, Separator } from "@heroui/react";
import { GearUsage } from "@/lib/api-server";
import { getGearImageUrl } from "@/lib/api";
import { BrandChip, Sparkline } from "@/components/gear/Charts";

const MONO = "'JetBrains Mono', 'Noto Serif SC', monospace";

/** 行首图标。连字名必须 aria-hidden，否则读屏会念出 "photo_library" 这种字形名；
    与 11px 数字同基线时图标墨迹中心略高，下移 1.1px 补回（沿用照片详情页的量法） */
function TileIcon({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined shrink-0 text-outline"
      style={{ fontSize: 11, transform: "translateY(1.1px)" }}
    >
      {name}
    </span>
  );
}

function Tile({ icon, label, value, hint }: { icon: string; label: string; value: string; hint?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-1 rounded-lg border border-border-subtle px-1.5 py-1">
      <TileIcon name={icon} />
      <span className="sr-only">{label}</span>
      <span
        className="text-metadata-sm text-on-surface"
        title={hint || `${label} ${value}`}
        style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 0 }}
      >
        {value}
      </span>
    </div>
  );
}

/** 没有封面时的占位：把品牌名排成大字，比塞一个灰色破图标体面，也提醒后台去传图 */
function CoverPlaceholder({ gear }: { gear: GearUsage }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-surface-container-low">
      <span
        aria-hidden="true"
        className="material-symbols-outlined text-[30px] text-outline/70"
      >
        {gear.kind === "camera" ? "photo_camera" : "center_focus_strong"}
      </span>
      <span
        className="max-w-[85%] truncate text-label-caps uppercase tracking-[0.14em] text-outline"
        style={{ fontFamily: MONO }}
      >
        {gear.brand || "未命名"}
      </span>
      <span className="text-[9px] text-outline/70">封面待上传</span>
    </div>
  );
}

export default function GearCard({ gear }: { gear: GearUsage }) {
  const name = gear.label || (gear.brand ? `${gear.brand} ${gear.model}` : gear.model);
  const period =
    gear.first_shot && gear.last_shot && gear.first_shot !== gear.last_shot
      ? `${gear.first_shot.slice(0, 7)} → ${gear.last_shot.slice(0, 7)}`
      : gear.first_shot
        ? gear.first_shot.slice(0, 7)
        : "";
  // 瓷砖只有 ~76px 内容宽，「2024-05 → 2025-12」必被截断，所以只显示末次月份，整段区间挂 title
  const latest = (gear.last_shot || gear.first_shot).slice(0, 7);
  const peak = Math.max(...gear.series, 1);

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border border-border-subtle bg-surface p-0 shadow-[0_6px_14px_rgba(0,0,0,0.06)]">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {gear.has_image ? (
          <img
            src={getGearImageUrl(gear.id)}
            alt={name}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => {
              // 图挂了（R2 对象被删、后台还没重传）就退回占位，别留一个浏览器破图标
              e.currentTarget.style.display = "none";
            }}
          />
        ) : null}
        {!gear.has_image && <CoverPlaceholder gear={gear} />}
        <div className="absolute left-3 top-3 flex gap-2">
          <BrandChip>{gear.kind === "camera" ? "机身" : "镜头"}</BrandChip>
          {gear.brand ? <BrandChip>{gear.brand}</BrandChip> : null}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <div className="min-w-0">
          <h3
            className="truncate text-headline-mobile text-primary"
            style={{ fontFamily: "var(--font-display)", fontSize: 18 }}
            title={name}
          >
            {name}
          </h3>
          {/* 型号原文只在后台另起了展示名时才补一行，否则标题就是它，重复一遍没意义 */}
          {gear.label && (
            <p className="mt-0.5 truncate text-metadata-sm text-outline" title={gear.model} style={{ fontFamily: MONO }}>
              {gear.model}
            </p>
          )}
        </div>

        {/* 一行四张时卡片只有 ~256px，瓷砖再按三等分网格切会把「28-70mm」挤断；
            改成按内容宽度自动换行，宁可多占一行也不截断 */}
        <div className="flex flex-wrap gap-1.5">
          <Tile icon="photo_library" label="出片" value={`${gear.photos} 张`} />
          <Tile icon="camera" label="最大光圈" value={gear.max_aperture} />
          <Tile icon="straighten" label="焦段" value={gear.focal_range} />
          <Tile icon="donut_small" label="占比" value={`${gear.share}%`} />
          <Tile icon="schedule" label="最近拍摄" value={latest} hint={period ? `使用区间 ${period}` : undefined} />
        </div>

        {peak > 0 && gear.photos > 0 && <Sparkline series={gear.series} />}

        {gear.note && (
          <>
            <Separator />
            <p className="line-clamp-3 text-body-md text-on-surface-variant">{gear.note}</p>
          </>
        )}
      </div>
    </Card>
  );
}
