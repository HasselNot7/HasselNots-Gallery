"use client";

import { Card } from "@heroui/react";
import CountUp from "@/components/reactbits/CountUp";
import GearCard from "@/components/gear/GearCard";
import { BarRows, ColumnChart, DonutChart, SectionTitle } from "@/components/gear/Charts";
import { EquipmentStats, GearUsage } from "@/lib/api-server";

const MONO = "'JetBrains Mono', 'Noto Serif SC', monospace";

/** 后端区间图会把零值档也返回（保持横轴连续），全零的那张图不必占一屏 */
function hasCounts(items: { count: number }[]) {
  return items.some((i) => i.count > 0);
}

function Metric({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  return (
    <Card className="gap-1 rounded-xl border border-border-subtle bg-surface p-4">
      <span className="text-label-caps uppercase tracking-widest text-outline">{label}</span>
      <span className="text-headline-lg text-primary tabular-nums" style={{ fontFamily: MONO }}>
        <CountUp to={value} duration={1.1} />
        {suffix && <span className="text-metadata-sm text-outline">{suffix}</span>}
      </span>
    </Card>
  );
}

function ChartCard({
  title,
  aside,
  children,
  className = "",
}: {
  title: string;
  aside?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`gap-4 rounded-xl border border-border-subtle bg-surface p-5 ${className}`}>
      <div className="flex items-end justify-between gap-3">
        <h3 className="text-label-caps uppercase tracking-widest text-secondary">{title}</h3>
        {aside && <span className="text-metadata-sm shrink-0 text-outline">{aside}</span>}
      </div>
      {children}
    </Card>
  );
}

function GearGrid({ items, empty }: { items: GearUsage[]; empty: string }) {
  if (!items.length) {
    return <p className="text-body-md text-outline">{empty}</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((g) => (
        <GearCard key={`${g.kind}-${g.id}`} gear={g} />
      ))}
    </div>
  );
}

export default function EquipmentStatsView({ stats }: { stats: EquipmentStats }) {
  const cameras = stats.gear.filter((g) => g.kind === "camera");
  const lenses = stats.gear.filter((g) => g.kind === "lens");
  // 「未记录」是后端给没存过 Make 的老照片兜的底，不该算进品牌数
  const brands = new Set(
    [...stats.camera_brands, ...stats.lens_brands]
      .filter((b) => b.name !== "未记录")
      .map((b) => b.name),
  );
  const years = stats.yearly.map((y) => Number(y.name)).filter(Number.isFinite);
  const span = years.length ? Math.max(...years) - Math.min(...years) + 1 : 0;
  const usage = stats.gear
    .filter((g) => g.photos > 0)
    .map((g) => ({ name: g.label || `${g.brand} ${g.model}`.trim() || g.model, count: g.photos }));
  const missingCover = stats.gear.filter((g) => !g.has_image).length;

  return (
    <div className="flex flex-col gap-12 max-md:gap-9">
      <section>
        <SectionTitle aside={`共 ${stats.total_photos} 张在库照片`}>总览</SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric value={stats.total_photos} label="照片" />
          <Metric value={stats.gear.length} label="器材" />
          <Metric value={brands.size} label="品牌" />
          <Metric value={span} label="跨度" suffix="年" />
        </div>
      </section>

      {(stats.camera_brands.length > 0 || stats.lens_brands.length > 0) && (
        <section>
          <SectionTitle aside="按照片张数">品牌构成</SectionTitle>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {stats.camera_brands.length > 0 && (
              <ChartCard title="机身品牌" aside={`${stats.camera_brands.length} 家`}>
                <DonutChart data={stats.camera_brands} />
              </ChartCard>
            )}
            {stats.lens_brands.length > 0 && (
              <ChartCard title="镜头品牌" aside={`${stats.lens_brands.length} 家`}>
                <DonutChart data={stats.lens_brands} />
              </ChartCard>
            )}
          </div>
        </section>
      )}

      {cameras.length > 0 && (
        <section>
          <SectionTitle aside={`${cameras.length} 台`}>机身</SectionTitle>
          <GearGrid items={cameras} empty="还没有登记机身" />
        </section>
      )}

      {lenses.length > 0 && (
        <section>
          <SectionTitle aside={`${lenses.length} 支`}>镜头</SectionTitle>
          <GearGrid items={lenses} empty="还没有登记镜头" />
        </section>
      )}

      {(hasCounts(stats.focal_lengths) || hasCounts(stats.apertures)) && (
        <section>
          <SectionTitle aside="EXIF 直出">焦段与光圈</SectionTitle>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {hasCounts(stats.focal_lengths) && (
              <ChartCard title="焦段分布" aside="mm">
                <ColumnChart data={stats.focal_lengths} />
              </ChartCard>
            )}
            {hasCounts(stats.apertures) && (
              <ChartCard title="光圈分布" aside="f">
                <ColumnChart data={stats.apertures} />
              </ChartCard>
            )}
          </div>
        </section>
      )}

      {(hasCounts(stats.iso_ranges) || hasCounts(stats.shutter_ranges)) && (
        <section>
          <SectionTitle aside="曝光参数">感光度与快门</SectionTitle>
          {/* 分桶而不是逐值列：ISO 实到 13 个值、快门 35 个，逐值成图既看不出分布也读不出趋势 */}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {hasCounts(stats.iso_ranges) && (
              <ChartCard title="ISO" aside="按感光度区间">
                <ColumnChart data={stats.iso_ranges} />
              </ChartCard>
            )}
            {hasCounts(stats.shutter_ranges) && (
              <ChartCard title="快门" aside="按曝光时长区间">
                <ColumnChart data={stats.shutter_ranges} />
              </ChartCard>
            )}
          </div>
        </section>
      )}

      {stats.yearly.length > 0 && (
        <section>
          <SectionTitle aside="按拍摄年份">产出趋势</SectionTitle>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartCard title="逐年出片">
              <ColumnChart data={stats.yearly} height={130} />
            </ChartCard>
            {usage.length > 0 && (
              <ChartCard title="各器材出片量" aside="Top 8">
                <BarRows items={usage.slice(0, 8)} />
              </ChartCard>
            )}
          </div>
        </section>
      )}

      {missingCover > 0 && (
        <p className="text-metadata-sm text-outline">
          还有 {missingCover} 件器材没有封面图 — 后台「器材」面板里可以逐件上传。
        </p>
      )}
    </div>
  );
}
