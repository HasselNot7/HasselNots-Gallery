"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/api-server";

export type SiteConfig = Pick<
  SiteSettings,
  "site_title" | "site_name" | "footer_title" | "footer_copyright" | "site_tagline"
>;

const SiteConfigContext = createContext<SiteConfig>(DEFAULT_SETTINGS);

/** 空串/纯空白一律回退默认值，避免后台清空字段后前台留白 */
const textOr = (v: string | undefined, fallback: string) => (v && v.trim() !== "" ? v : fallback);

export function SiteConfigProvider({
  value,
  children,
}: {
  value: Partial<SiteConfig>;
  children: ReactNode;
}) {
  const config: SiteConfig = {
    site_title: textOr(value.site_title, DEFAULT_SETTINGS.site_title),
    site_name: textOr(value.site_name, DEFAULT_SETTINGS.site_name),
    footer_title: textOr(value.footer_title, DEFAULT_SETTINGS.footer_title),
    footer_copyright: textOr(value.footer_copyright, DEFAULT_SETTINGS.footer_copyright),
    site_tagline: textOr(value.site_tagline, DEFAULT_SETTINGS.site_tagline),
  };
  return <SiteConfigContext.Provider value={config}>{children}</SiteConfigContext.Provider>;
}

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext);
}
