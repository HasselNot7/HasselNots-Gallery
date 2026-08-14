import { Photo, fetchPhotos } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GallerySection from "@/components/GallerySection";

export default async function GalleryPage() {
  let items: Photo[] = [];
  let total = 0;
  try {
    const data = await fetchPhotos(true, 0, 12);
    items = data.items;
    total = data.total;
  } catch {
    // Backend not available, show empty state
  }

  return (
    <>
      <Navbar />

      <section className="w-full bg-surface py-8 md:py-12 px-4 md:px-grid-margin border-t border-primary/20 relative z-30 shadow-[0_-10px_30px_rgba(22,56,40,0.05)]">
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `
            linear-gradient(to right, rgba(45,79,62,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(45,79,62,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          opacity: 0.15,
        }} />

        {/* Scattered industrial decorations */}
        {/* Top-left corner bracket */}
        <div className="absolute top-3 left-3 w-6 h-6 z-20 pointer-events-none border-t-2 border-l-2 border-primary/30 hidden md:block" />
        {/* Top-right corner bracket */}
        <div className="absolute top-3 right-3 w-6 h-6 z-20 pointer-events-none border-t-2 border-r-2 border-primary/30 hidden md:block" />

        {/* Left middle: vertical ruler ticks */}
        <div className="absolute left-3 top-1/3 z-20 pointer-events-none hidden md:flex flex-col items-start gap-1.5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-1">
              <div className={`w-4 h-px ${i % 2 === 0 ? "bg-primary/40" : "bg-primary/20"}`} />
              {i % 2 === 0 && <span className="text-[8px] text-primary/50 font-mono">{i * 100}</span>}
            </div>
          ))}
        </div>

        {/* Right middle: horizontal ruler ticks */}
        <div className="absolute top-1/2 right-3 z-20 pointer-events-none hidden lg:flex items-center gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex flex-col items-end gap-1">
              <div className={`h-px ${i % 3 === 0 ? "w-4 bg-primary/40" : "w-2 bg-primary/20"}`} />
              {i % 3 === 0 && <span className="text-[8px] text-primary/50 font-mono">{i * 200}</span>}
            </div>
          ))}
        </div>

        {/* Bottom middle: dotted connector */}
        <div className="absolute bottom-6 left-1/4 right-1/4 z-20 pointer-events-none hidden lg:flex items-center gap-2">
          <span className="w-2 h-2 rounded-full border border-primary/40 bg-primary-fixed/50" />
          <div className="flex-1 border-t border-dashed border-primary/20" />
          <span className="w-2 h-2 rounded-full border border-primary/40" />
        </div>

        {/* Bottom-left: small scale segment */}
        <div className="absolute bottom-1/4 left-3 z-20 pointer-events-none hidden md:flex items-end gap-1.5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className={`w-px ${i % 3 === 0 ? "h-3.5 bg-primary/30" : "h-2 bg-primary/20"}`} />
          ))}
        </div>

        {/* Bottom-right: coordinate readout */}
        <div className="absolute bottom-4 right-6 z-20 pointer-events-none hidden lg:block text-right text-[9px] text-primary/50 font-mono leading-4">
          <div>NODE: {total}</div>
          <div>BATCH: 12</div>
          <div>STREAM: OK</div>
        </div>

        <div className="max-w-[1800px] mx-auto relative z-10 px-0 md:px-4">
          <GallerySection initialPhotos={items} initialTotal={total} />
        </div>
      </section>

      <Footer />
    </>
  );
}
