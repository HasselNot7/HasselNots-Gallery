import { fetchEquipmentStats, EquipmentStats, EquipmentStat } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
          <div className="flex-1 h-1 bg-primary/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.max((item.count / max) * 100, 2)}%` }}
            />
          </div>
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

export default async function EquipmentPage() {
  let stats: EquipmentStats = {
    total_photos: 0,
    cameras: [],
    lenses: [],
    focal_lengths: [],
    apertures: [],
    isos: [],
    shutter_speeds: [],
  };
  try {
    stats = await fetchEquipmentStats();
  } catch {
    /* backend unavailable */
  }

  const hasData =
    stats.cameras.length + stats.lenses.length + stats.focal_lengths.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <h1
            className="text-headline-lg md:text-display-lg text-primary mb-2 uppercase"
            style={{ fontFamily: "var(--font-sigma)" }}
          >
            Gear
          </h1>
          <span className="text-metadata-sm text-outline" style={{ fontFamily: MONO }}>
            {stats.total_photos} PHOTO{stats.total_photos === 1 ? "" : "S"} · EXIF SUMMARY
          </span>
        </div>

        {hasData ? (
          <>
            <Section title="Cameras" items={stats.cameras} />
            <Section title="Lenses" items={stats.lenses} />
            <Section title="Focal Lengths" items={stats.focal_lengths} />
            <Section title="Apertures" items={stats.apertures} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">
              photo_camera
            </span>
            <p className="text-headline-mobile text-on-surface-variant">No EXIF data yet</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
