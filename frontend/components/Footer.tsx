export default function Footer() {
  return (
    <footer className="bg-background border-t border-border-subtle w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-4 md:px-grid-margin py-12 md:py-section-gap max-w-7xl mx-auto">
        <div className="md:col-span-2 flex flex-col gap-4">
          <span className="text-label-caps font-bold text-primary">HASSELNOT&apos;S GALLERY</span>
          <p className="text-body-md text-on-surface-variant max-w-sm">
            Precision photography portfolio. Every frame tells a story.
          </p>
          <span className="text-metadata-sm text-outline">
            &copy; {new Date().getFullYear()} HASSELNOT&apos;S GALLERY. All rights reserved.
          </span>
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <span className="text-label-caps text-secondary tracking-widest">Navigate</span>
          <a href="/" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors">
            Home
          </a>
          <a href="/gallery" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors">
            Gallery
          </a>
          <a href="/map" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors">
            Footprints
          </a>
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <span className="text-label-caps text-secondary tracking-widest">Admin</span>
          <a href="/login" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors">
            Login
          </a>
        </div>
      </div>
    </footer>
  );
}
