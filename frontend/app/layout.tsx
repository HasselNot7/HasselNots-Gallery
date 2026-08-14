import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import AnimatedBackground from "@/components/AnimatedBackground";
import VisitTracker from "@/components/VisitTracker";

const sigmaSerif = localFont({
  src: "./fonts/SigmaSerif-Text.ttf",
  variable: "--font-sigma",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HasselNot's Gallery — Photography Portfolio",
    template: "%s — HasselNot's Gallery",
  },
  description: "Precision photography portfolio. Every frame tells a story.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
        }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@500;600&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;700&family=Noto+Serif+SC:wght@400;500;600&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1" />
      </head>
      <body className={`min-h-full flex flex-col relative ${sigmaSerif.variable}`}>
        <AnimatedBackground />
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
