"use client";

import { usePathname } from "next/navigation";

export default function PageBackground() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 0 }}>
      {/* 基础暖白 + 顶部橙红光晕 + 左侧冷调 + 底部渐变 */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(80% 60% at 90% -15%, rgba(248, 88, 58, 0.40), rgba(248, 88, 58, 0.10) 45%, transparent 70%),
            radial-gradient(70% 70% at -10% 50%, rgba(20, 20, 20, 0.12), transparent 70%),
            radial-gradient(60% 45% at 50% 115%, rgba(20, 20, 20, 0.16), transparent 70%),
            linear-gradient(160deg, #f7f7f4, #faf9f6 40%, #f1f0ec)
          `,
        }}
      />
      {/* 细网格 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(20, 20, 20, 0.10) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(20, 20, 20, 0.10) 1px, transparent 1px)
          `,
          backgroundSize: "56px 56px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.2))",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.2))",
        }}
      />
      {/* 噪点质感 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`,
          opacity: 0.07,
        }}
      />
    </div>
  );
}
