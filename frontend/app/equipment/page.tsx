import { fetchEquipmentStats, EquipmentStats } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EquipmentStatsView from "@/components/EquipmentStatsView";

const MONO = "'JetBrains Mono', 'Noto Serif SC', monospace";

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
            器材
          </h1>
          <span className="text-metadata-sm text-outline" style={{ fontFamily: MONO }}>
            {stats.total_photos} 张照片 · EXIF 统计
          </span>
        </div>

        {hasData ? (
          <EquipmentStatsView stats={stats} />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">
              photo_camera
            </span>
            <p className="text-headline-mobile text-on-surface-variant">暂无 EXIF 数据</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
