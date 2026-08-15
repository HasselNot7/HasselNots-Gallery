import dynamic from "next/dynamic";

const ShaderHeroBackground = dynamic(() => import("@/components/ShaderHeroBackground"));

export default function HeroSection({
  heroTitle = "Precision Capture.\nTimeless Frames.",
  heroDescription = "A curated collection of photographic works — each frame capturing the interplay of light, geometry, and fleeting moments across the globe.",
  heroIcon = "photo_camera",
  heroIconUrl = "",
  shaderColors,
}: {
  heroTitle?: string;
  heroDescription?: string;
  heroIcon?: string;
  heroIconUrl?: string;
  shaderColors?: {
    color1?: string;
    color2?: string;
    color3?: string;
    color4?: string;
    color5?: string;
    color6?: string;
    base?: string;
    gradientSize?: number;
    gradientCount?: number;
    speed?: number;
    color1Weight?: number;
    color2Weight?: number;
  };
}) {
  const titleLines = heroTitle.split("\n");

  return (
    <main className="relative h-[calc(100svh+120px)] w-full bg-primary-fixed/10 border-b border-primary/20">
      <div className="sticky top-[64px] md:top-[72px] h-[calc(100svh-64px)] md:h-[calc(100svh-72px)] w-full flex overflow-hidden">
        {/* Left Vertical Sidebar */}
        <aside className="w-10 md:w-24 shrink-0 bg-primary-container text-primary-fixed flex flex-col justify-between items-center py-4 md:py-grid-margin border-r border-primary/30 z-20 shadow-[20px_0_40px_rgba(20,20,20,0.12)] relative">
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(20,20,20,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(20,20,20,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            opacity: 0.2,
          }} />
          <div className="relative z-10 text-metadata-sm tracking-widest uppercase transform rotate-180 border-l border-primary-fixed/30 pl-2 whitespace-nowrap hidden sm:block" style={{ writingMode: "vertical-rl", fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
            Collection
          </div>
          <div className="relative z-10 text-metadata-sm tracking-widest transform rotate-180 opacity-70 hidden sm:block" style={{ writingMode: "vertical-rl", fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
            {new Date().toLocaleDateString("en-GB")}
          </div>
          <div className="relative z-10 text-lg md:text-3xl tracking-tighter transform rotate-180 whitespace-nowrap" style={{ writingMode: "vertical-rl", fontFamily: "'Hanken Grotesk', sans-serif" }}>
            HasselNot
          </div>
        </aside>

        {/* Central Canvas */}
        <section className="relative flex-1 overflow-hidden flex items-center justify-center border-r border-primary/20">
          {/* Dynamic Shader Background */}
          <ShaderHeroBackground colors={shaderColors} />

          {/* Grid Overlay */}
          <div className="absolute inset-0 z-10 pointer-events-none" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(197,235,212,0.12) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(197,235,212,0.12) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            opacity: 0.5,
          }} />

          {/* Scattered industrial decorations */}
          {/* Top-left crosshair mark */}
          <div className="absolute top-3 left-3 w-8 h-8 z-20 pointer-events-none">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary-fixed/50" />
            <div className="absolute -top-0.5 -left-0.5 w-2 h-2 border-t-2 border-l-2 border-primary-fixed/70" />
          </div>

          {/* Bottom-right crosshair mark */}
          <div className="absolute bottom-3 right-3 w-8 h-8 z-20 pointer-events-none">
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary-fixed/50" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 border-b-2 border-r-2 border-primary-fixed/70" />
          </div>

          {/* Center crosshair */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 z-10 pointer-events-none opacity-40">
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-primary-fixed/40 border-l border-dashed border-primary-fixed/30" />
            <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 bg-primary-fixed/40 border-t border-dashed border-primary-fixed/30" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-primary-fixed/60 rotate-45 bg-transparent" />
          </div>

          {/* Top right: horizontal ruler ticks */}
          <div className="absolute top-1/3 right-0 z-20 pointer-events-none hidden md:flex items-center gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="flex flex-col items-end gap-1">
                <div className={`h-px ${i % 3 === 0 ? "w-4 bg-primary-fixed/50" : "w-2 bg-primary-fixed/25"}`} />
                {i % 3 === 0 && <span className="text-[8px] text-primary-fixed/70 font-mono">{i * 200}</span>}
              </div>
            ))}
          </div>

          {/* Left middle: vertical ruler ticks */}
          <div className="absolute left-0 top-1/3 z-20 pointer-events-none flex flex-col items-start gap-1.5">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-1">
                <div className={`w-4 h-px ${i % 2 === 0 ? "bg-primary-fixed/50" : "bg-primary-fixed/25"}`} />
                {i % 2 === 0 && <span className="text-[8px] text-primary-fixed/70 font-mono">{i * 100}</span>}
              </div>
            ))}
          </div>

          {/* Bottom middle: measurement line with label */}
          <div className="absolute bottom-6 left-1/4 right-1/4 z-20 pointer-events-none hidden lg:flex items-center gap-2">
            <span className="material-symbols-outlined text-[12px] text-primary-fixed/70">west</span>
            <div className="flex-1 h-px bg-primary-fixed/40 border-t border-dashed border-primary-fixed/30 relative">
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-primary-fixed/70 font-mono whitespace-nowrap">GAL-003 // 6.2M</span>
            </div>
            <span className="material-symbols-outlined text-[12px] text-primary-fixed/70">east</span>
          </div>

          {/* Top middle: small dotted connector */}
          <div className="absolute top-1/4 left-1/3 right-1/3 z-20 pointer-events-none hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-fixed border border-primary-fixed/60" />
            <div className="flex-1 border-t border-dashed border-primary-fixed/25" />
            <span className="w-2 h-2 rounded-full border border-primary-fixed/50" />
          </div>

          {/* Right middle: vertical dashed line with node */}
          <div className="absolute right-1/4 top-1/2 bottom-1/4 z-20 w-px pointer-events-none hidden md:block border-l border-dashed border-primary-fixed/20" />
          <div className="absolute right-1/4 top-1/2 z-20 pointer-events-none hidden md:block">
            <div className="w-2 h-2 -ml-1 rounded-full border border-primary-fixed/60 bg-surface" />
          </div>

          {/* Top middle right: coordinate readout */}
          <div className="absolute top-6 right-10 z-20 pointer-events-none hidden lg:block text-right text-[9px] text-primary-fixed/70 font-mono leading-4">
            <div>FOC: 35MM</div>
            <div>ISO: 100</div>
            <div>FRM: 012</div>
          </div>

          {/* Bottom left: small scale segment */}
          <div className="absolute bottom-1/4 left-6 z-20 pointer-events-none hidden md:flex items-end gap-1.5">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className={`w-px ${i % 3 === 0 ? "h-3.5 bg-primary-fixed/40" : "h-2 bg-primary-fixed/25"}`} />
            ))}
          </div>

          {/* Floating UI Elements */}
          <div className="relative z-20 w-full max-w-4xl px-grid-margin flex flex-col items-center">
            {/* Main Branded Card */}
            <div className="relative flex items-center justify-center gap-4 md:gap-6 max-w-4xl">
              {/* Icon */}
              {heroIconUrl ? (
                <div className="shrink-0 inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full overflow-hidden border border-primary/10 bg-surface shadow-[0_8px_18px_rgba(0,0,0,0.40),0_24px_52px_rgba(0,0,0,0.36)]">
                  <img src={heroIconUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="shrink-0 inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary-fixed text-primary border border-primary/10 shadow-[0_8px_18px_rgba(0,0,0,0.40),0_24px_52px_rgba(0,0,0,0.36)]">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{heroIcon}</span>
                </div>
              )}

              {/* Title */}
              <h1 className="text-3xl md:text-5xl lg:text-6xl text-primary tracking-normal uppercase drop-shadow-[0_5px_14px_rgba(0,0,0,0.45)]" style={{ fontFamily: "var(--font-sigma)" }}>
                {titleLines.map((line, i) => (
                  <span key={i} className="block md:whitespace-nowrap">
                    {line}
                    {i < titleLines.length - 1 && <br />}
                  </span>
                ))}
              </h1>
            </div>
          </div>
        </section>

        {/* Right Decorative Sidebar */}
        <aside className="hidden xl:flex w-16 shrink-0 bg-surface/80 border-l border-primary/20 flex-col items-center justify-between py-grid-margin relative">
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: `
              linear-gradient(to right, rgba(20,20,20,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(20,20,20,0.05) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            opacity: 0.3,
          }} />
          <div className="w-px h-24 bg-primary/30 relative z-10" />
          <div className="w-3 h-3 border border-primary/50 rounded-full relative z-10" />
          <div className="w-px h-full bg-primary/20 mx-auto my-4 relative z-10">
            <div className="absolute top-1/4 left-[-3px] w-2 h-2 bg-primary" />
            <div className="absolute top-3/4 left-[-3px] w-2 h-2 bg-primary-fixed border border-primary" />
          </div>
          <div className="w-3 h-3 border border-primary/50 rounded-full relative z-10" />
          <div className="w-px h-24 bg-primary/30 relative z-10" />
        </aside>
      </div>
    </main>
  );
}
