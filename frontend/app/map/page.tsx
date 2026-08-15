import { fetchGeotaggedPhotos, getPhotoImageUrl, Photo } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MapClient from "@/components/MapClient";
import { yearColor, yearsForLegend } from "@/lib/mapYears";

export default async function MapPage() {
  let photos: Photo[] = [];
  try {
    photos = await fetchGeotaggedPhotos();
  } catch {
    // backend unavailable
  }

  const markers = photos
    .filter((p) => p.latitude && p.longitude)
    .map((p) => ({
      id: p.id,
      latitude: p.latitude!,
      longitude: p.longitude!,
      title: p.title || "Untitled",
      thumbnail: getPhotoImageUrl(p.id, true),
      camera: p.camera_model,
      shoot_time: p.shoot_time || "",
      location: p.location_name || "Unknown Location",
    }));

  const defaultCenter: [number, number] =
    markers.length > 0 ? [markers[0].latitude, markers[0].longitude] : [35.6762, 139.6503];

  const legendYears = yearsForLegend(markers);

  const locations = markers.reduce<
    Record<string, { photos: typeof markers; count: number; lat: number; lng: number; name: string }>
  >((acc, m) => {
    const key = m.location;
    if (!acc[key]) {
      acc[key] = { photos: [], count: 0, lat: m.latitude, lng: m.longitude, name: key };
    }
    acc[key].photos.push(m);
    acc[key].count++;
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* Header Section with grid overlay */}
        <section className="relative px-4 md:px-grid-margin pt-5 md:pt-6 pb-3 border-b border-primary/15 w-full bg-primary-fixed/5">
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(20,20,20,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(20,20,20,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            opacity: 0.2,
          }} />

          <div className="relative z-10">
            <h1 className="text-2xl md:text-display-lg text-primary mb-2 md:mb-3 uppercase" style={{ fontFamily: "var(--font-sigma)" }}>Photography Footprints</h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-metadata-sm text-on-surface-variant">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">hub</span>
                {Object.keys(locations).length} Nodes
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                {Object.keys(locations).length} Locations
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">photo_camera</span>
                {markers.length} Photos
              </span>
            </div>
          </div>
        </section>

        {/* Map Container */}
        <div className="flex-1 border-y border-primary/15 relative">
          <div className="flex flex-col lg:flex-row">
            <div className="relative h-[400px] lg:h-[calc(100vh-200px)] lg:flex-1">
              {/* Grid overlay on map */}
              <div className="absolute inset-0 z-[5] pointer-events-none" style={{
                backgroundImage: `
                  linear-gradient(to right, rgba(20,20,20,0.05) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(20,20,20,0.05) 1px, transparent 1px)
                `,
                backgroundSize: "40px 40px",
                opacity: 0.4,
              }} />

              {/* Top-left crosshair mark */}
              <div className="absolute top-3 left-3 w-8 h-8 z-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary/50" />
                <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2 border-primary/70" />
              </div>

              {/* Bottom-right crosshair mark */}
              <div className="absolute bottom-3 right-3 w-8 h-8 z-20 pointer-events-none">
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary/50" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2 border-primary/70" />
              </div>

              {/* Center crosshair */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 z-10 pointer-events-none opacity-40">
                <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary/40 border-l border-dashed border-primary/30" />
                <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-primary/40 border-t border-dashed border-primary/30" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-primary/60 rotate-45 bg-transparent" />
              </div>

              {/* Left middle: vertical ruler ticks */}
              <div className="absolute left-0 top-1/3 z-20 pointer-events-none flex flex-col items-start gap-1.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className={`w-4 h-px ${i % 2 === 0 ? "bg-primary/50" : "bg-primary/25"}`} />
                    {i % 2 === 0 && <span className="text-[8px] text-primary/60 font-mono">{i * 100}</span>}
                  </div>
                ))}
              </div>

              {/* Right middle: horizontal ruler ticks */}
              <div className="absolute top-1/2 right-0 z-20 pointer-events-none hidden md:flex items-center gap-1.5">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="flex flex-col items-end gap-1">
                    <div className={`h-px ${i % 3 === 0 ? "w-4 bg-primary/50" : "w-2 bg-primary/25"}`} />
                    {i % 3 === 0 && <span className="text-[8px] text-primary/60 font-mono">{i * 200}</span>}
                  </div>
                ))}
              </div>

              {/* Top middle: measurement line with label */}
              <div className="absolute top-6 left-1/4 right-1/4 z-20 pointer-events-none hidden lg:flex items-center gap-2">
                <span className="material-symbols-outlined text-[12px] text-primary/60">west</span>
                <div className="flex-1 h-px bg-primary/40 border-t border-dashed border-primary/30 relative">
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-primary/60 font-mono whitespace-nowrap">MAP-004 // 12.8KM</span>
                </div>
                <span className="material-symbols-outlined text-[12px] text-primary/60">east</span>
              </div>

              {/* Coordinate readout (top left) */}
              <div className="absolute top-3 right-10 z-20 pointer-events-none hidden lg:block text-right text-[9px] text-primary/60 font-mono leading-4">
                <div>LAT: 35.6762</div>
                <div>LNG: 139.6503</div>
                <div>ALT: 42M</div>
              </div>

              {/* Bottom left: small dotted connector with node */}
              <div className="absolute bottom-6 left-6 z-20 pointer-events-none hidden md:flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-fixed border border-primary" />
                <span className="w-16 border-t border-dashed border-primary/30" />
                <span className="w-2 h-2 rounded-full border border-primary/50" />
              </div>

              <MapClient markers={markers} center={defaultCenter} />

              {/* 年份图例 */}
              {legendYears.length > 0 && (
                <div className="absolute bottom-3 left-3 z-[600] bg-surface/90 backdrop-blur border border-border-subtle rounded-md px-3 py-2 shadow-md">
                  <div className="text-[9px] text-outline uppercase tracking-widest mb-1.5" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                    By Year
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {legendYears.map((y) => (
                      <span key={y} className="flex items-center gap-1.5 text-metadata-sm text-on-surface-variant">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-white/60"
                          style={{ background: yearColor(y) }}
                        />
                        {y}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <aside className="w-full h-[300px] lg:h-[calc(100vh-200px)] lg:w-80 glass-panel overflow-y-auto relative">
              {/* Vertical tick marks on the left edge of aside */}
              <div className="absolute top-0 bottom-0 left-0 z-20 w-2 pointer-events-none flex flex-col justify-around items-center">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className={`w-px ${i % 2 === 0 ? "h-3 bg-primary/40" : "h-1.5 bg-primary/20"}`} />
                ))}
              </div>
              <div className="absolute top-2 right-2 w-3 h-3 border-t border-r border-primary/40 pointer-events-none" />
              <div className="p-4 md:p-6">
                <h2 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-4">
                  Locations
                </h2>
                {Object.values(locations).length === 0 ? (
                  <p className="text-metadata-sm text-outline">
                    No geotagged photos found.
                  </p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {Object.values(locations).map((loc, i) => (
                      <div key={i} className="border-b border-primary/10 pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="material-symbols-outlined text-[16px] text-primary shrink-0">location_on</span>
                          <span className="text-metadata-sm text-on-surface break-words">
                            {loc.name}
                          </span>
                        </div>
                        <div className="text-metadata-sm font-medium text-primary mb-2" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                          {loc.count} Photo{loc.count > 1 ? "s" : ""}
                        </div>
                        <div className="flex gap-1 overflow-x-auto pb-1">
                          {loc.photos.map((p) => (
                            <a
                              key={p.id}
                              href={`/photo/${p.id}`}
                              className="w-16 h-16 flex-shrink-0 border border-primary/15 overflow-hidden hover:border-primary transition-colors"
                            >
                              <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        <div className="px-4 md:px-grid-margin py-4 max-w-7xl mx-auto border-x border-primary/15 w-full flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-metadata-sm">
          <span className="text-on-surface-variant flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full border border-primary/50" />
            <span className="w-4 border-t border-dashed border-primary/25" />
            {markers.length} geotagged entries found
          </span>
          <div className="flex items-center gap-2 text-primary/70">
            <span className="w-1.5 h-1.5 rounded-full bg-mint-accent border border-primary animate-pulse" />
            <span className="uppercase tracking-widest">Data Stream Active</span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
