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
      {/* 图表要横向空间，原来的 max-w-4xl 会把环形图和柱图挤成一条；
          7xl 与相册、照片详情页同宽，卡片一行仍是四张，只是每张宽 32px */}
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-md:py-8 max-w-7xl mx-auto w-full">
        {/* 标题与统计行都删了：导航栏已点亮「器材」，数字总览那排卡片里都有 */}
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
