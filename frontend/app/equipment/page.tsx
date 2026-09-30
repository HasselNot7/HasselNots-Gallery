import { fetchEquipmentStats, EquipmentStats } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EquipmentStatsView from "@/components/EquipmentStatsView";

export default async function EquipmentPage() {
  let stats: EquipmentStats = {
    total_photos: 0,
    cameras: [],
    lenses: [],
    focal_lengths: [],
    apertures: [],
    iso_ranges: [],
    shutter_ranges: [],
    camera_brands: [],
    lens_brands: [],
    yearly: [],
    months: [],
    gear: [],
  };
  try {
    stats = await fetchEquipmentStats();
  } catch {
    /* backend unavailable */
  }

  const hasData =
    stats.gear.length + stats.cameras.length + stats.lenses.length + stats.focal_lengths.length > 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* 图表要横向空间，原来的 max-w-4xl 会把环形图和柱图挤成一条 */}
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-md:py-8 max-w-6xl mx-auto w-full">
        {/* 标题下不再重复一遍统计数字，总览那排卡片就是这些数 */}
        <div className="mb-10 max-md:mb-6">
          <h1
            className="text-headline-lg md:text-display-lg text-primary uppercase"
            style={{ fontFamily: "var(--font-display)" }}
          >
            器材
          </h1>
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
