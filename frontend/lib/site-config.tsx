"use client";

import { createContext, useContext, type ReactNode } from "react";

export interface SiteConfig {
  site_name: string;
  footer_title: string;
  footer_copyright: string;
  site_tagline: string;
}

/** 后端不可用、或字段被清空时的兜底字面量，需与 backend/routes/settings.py 的 DEFAULTS 一致 */
const FALLBACK: SiteConfig = {
  site_name: "Art",
  footer_title: "HASSELNOT'S GALLERY",
  footer_copyright: "© {year} HASSELNOT'S GALLERY. All rights reserved.",
  site_tagline: "Precision photography portfolio. Every frame tells a story.",
};

const SiteConfigContext = createContext<SiteConfig>(FALLBACK);

const textOr = (v: string | undefined, fallback: string) => (v && v.trim() !== "" ? v : fallback);

export function SiteConfigProvider({
  value,
  children,
}: {
  value: Partial<SiteConfig>;
  children: ReactNode;
}) {
  const config: SiteConfig = {
    site_name: textOr(value.site_name, FALLBACK.site_name),
    footer_title: textOr(value.footer_title, FALLBACK.footer_title),
    footer_copyright: textOr(value.footer_copyright, FALLBACK.footer_copyright),
    site_tagline: textOr(value.site_tagline, FALLBACK.site_tagline),
  };
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext);
}
