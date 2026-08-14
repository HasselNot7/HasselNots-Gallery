export default function Footer() {
  return (
    <footer className="bg-background border-t border-border-subtle w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-4 md:px-grid-margin py-12 md:py-section-gap max-w-7xl mx-auto">
        <div className="md:col-span-2 flex flex-col gap-4">
          <span className="text-label-caps font-bold text-primary uppercase" style={{ fontFamily: "var(--font-display)" }}>HASSELNOT&apos;S GALLERY</span>
          <p className="text-body-md text-on-surface-variant max-w-sm uppercase" style={{ fontFamily: "var(--font-display)" }}>
            Precision photography portfolio. Every frame tells a story.
          </p>
          <span className="text-metadata-sm text-outline uppercase" style={{ fontFamily: "var(--font-display)" }}>
            &copy; {new Date().getFullYear()} HASSELNOT&apos;S GALLERY. All rights reserved.
          </span>
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <span className="text-label-caps text-secondary tracking-widest uppercase" style={{ fontFamily: "var(--font-display)" }}>Navigate</span>
          <a href="/" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-display)" }}>
            Home
          </a>
          <a href="/gallery" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-display)" }}>
            Gallery
          </a>
          <a href="/map" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-display)" }}>
            Footprints
          </a>
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <span className="text-label-caps text-secondary tracking-widest uppercase" style={{ fontFamily: "var(--font-display)" }}>Admin</span>
          <a href="/login" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-display)" }}>
            Login
          </a>
        </div>
      </div>
    </footer>
  );
}
