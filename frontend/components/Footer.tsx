"use client";

import { useEffect, useState } from "react";

const DEFAULT_TAGLINE = "Precision photography portfolio. Every frame tells a story.";

export default function Footer() {
  const [tagline, setTagline] = useState(DEFAULT_TAGLINE);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.site_tagline) setTagline(data.site_tagline);
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="bg-white/25 backdrop-blur-xl border-t border-border-subtle w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-4 md:px-grid-margin py-12 md:py-section-gap max-w-7xl mx-auto">
        <div className="md:col-span-2 flex flex-col gap-4">
          <span className="text-label-caps font-bold text-primary uppercase" style={{ fontFamily: "var(--font-sigma)" }}>HASSELNOT&apos;S GALLERY</span>
          <p className="text-body-md text-on-surface-variant max-w-sm uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            {tagline}
          </p>
          <span className="text-metadata-sm text-outline uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            &copy; {new Date().getFullYear()} HASSELNOT&apos;S GALLERY. All rights reserved.
          </span>
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <span className="text-label-caps text-secondary tracking-widest uppercase" style={{ fontFamily: "var(--font-sigma)" }}>Navigate</span>
          <a href="/" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            Home
          </a>
          <a href="/gallery" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            Gallery
          </a>
          <a href="/albums" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            Albums
          </a>
          <a href="/blog" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            Blog
          </a>
          <a href="/map" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            Footprints
          </a>
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <span className="text-label-caps text-secondary tracking-widest uppercase" style={{ fontFamily: "var(--font-sigma)" }}>Admin</span>
          <a href="/login" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            Login
          </a>
        </div>
      </div>
    </footer>
  );
}
