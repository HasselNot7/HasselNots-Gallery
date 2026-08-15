"use client";

import { usePathname } from "next/navigation";

export default function PageBackground() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: -1 }}>
      {/* 基础暖白 + 顶部橙红光晕 + 左侧冷调 + 底部渐变 */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(60% 45% at 88% -5%, rgba(248, 88, 58, 0.08), transparent 65%),
            radial-gradient(55% 55% at 0% 40%, rgba(20, 20, 20, 0.045), transparent 70%),
            radial-gradient(40% 30% at 50% 110%, rgba(248, 88, 58, 0.05), transparent 70%),
            linear-gradient(to bottom, #fbfbfb, #ffffff 40%, #fafafa)
          `,
        }}
      />
      {/* 细网格 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(20, 20, 20, 0.045) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(20, 20, 20, 0.045) 1px, transparent 1px)
          `,
          backgroundSize: "52px 52px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.25) 50%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), rgba(0,0,0,0.25) 50%, transparent)",
        }}
      />
      {/* 噪点质感 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E")`,
          opacity: 0.035,
        }}
      />
    </div>
  );
}
