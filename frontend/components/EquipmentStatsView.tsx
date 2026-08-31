"use client";

import { ProgressBar } from "@heroui/react";
import { EquipmentStat } from "@/lib/api-server";

const MONO = "'JetBrains Mono', 'Noto Serif SC', monospace";

function StatBars({ items }: { items: EquipmentStat[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-3 md:gap-5">
          <span
            className="w-32 md:w-64 shrink-0 truncate text-body-md text-primary"
            title={item.name}
          >
            {item.name}
          </span>
          <ProgressBar
            aria-label={item.name}
            value={(item.count / max) * 100}
            className="flex-1"
          >
            <ProgressBar.Track className="h-1">
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <span
            className="w-10 text-right text-metadata-sm text-outline shrink-0"
            style={{ fontFamily: MONO }}
          >
            {item.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function Section({ title, items }: { title: string; items: EquipmentStat[] }) {
  if (items.length === 0) return null;
  return (
    <section className="mb-12">
      <h2 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-5 uppercase">
        {title}
      </h2>
      <StatBars items={items} />
    </section>
  );
}

export default function EquipmentStatsView({ stats }: { stats: { total_photos: number; cameras: EquipmentStat[]; lenses: EquipmentStat[]; focal_lengths: EquipmentStat[]; apertures: EquipmentStat[]; isos: EquipmentStat[]; shutter_speeds: EquipmentStat[] } }) {
  return (
    <>
      <Section title="Cameras" items={stats.cameras} />
      <Section title="Lenses" items={stats.lenses} />
      <Section title="Focal Lengths" items={stats.focal_lengths} />
      <Section title="Apertures" items={stats.apertures} />
    </>
  );
}
