import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import PageBackground from "@/components/PageBackground";
import VisitTracker from "@/components/VisitTracker";
import { DEFAULT_SETTINGS, fetchSettings, isOn } from "@/lib/api-server";
import { SiteConfigProvider } from "@/lib/site-config";

const sigmaSerif = localFont({
  src: "./fonts/SigmaSerif-Text.ttf",
  variable: "--font-sigma",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchSettings();
  const siteTitle = settings?.site_title?.trim() || DEFAULT_SETTINGS.site_title;
  return {
    title: {
      default: siteTitle,
      template: `%s — ${siteTitle}`,
    },
    description: settings?.site_tagline?.trim() || DEFAULT_SETTINGS.site_tagline,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await fetchSettings();
  const ripple = {
    ink1: settings?.water_ink1 || "#171717",
    ink2: settings?.water_ink2 || "#0a0a0a",
    inkTop: parseFloat(settings?.water_ink_top || "0.15"),
    strength: parseFloat(settings?.water_strength || "1.0"),
  };

  return (
    <html lang="en" className={`h-full antialiased ${sigmaSerif.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;700&family=Noto+Serif+SC:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1" />
      </head>
      <body className="min-h-full flex flex-col relative">
        <PageBackground ripple={ripple} enabled={isOn(settings?.show_water_ripple)} />
        <VisitTracker />
        <SiteConfigProvider value={settings}>
          <div className="relative z-10 flex flex-col flex-1">{children}</div>
        </SiteConfigProvider>
      </body>
    </html>
  );
}
