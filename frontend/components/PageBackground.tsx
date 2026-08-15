"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import type { RippleSettings } from "@/components/WaterRippleBackground";

const WaterRippleBackground = dynamic(() => import("@/components/WaterRippleBackground"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0" aria-hidden="true" style={{ zIndex: 0, background: "#ffffff" }} />
  ),
});

export default function PageBackground({ ripple }: { ripple?: RippleSettings }) {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/photo/") ||
    pathname === "/map"
  )
    return null;

  return <WaterRippleBackground settings={ripple ?? { ink1: "#171717", ink2: "#0a0a0a", inkTop: 0.15, strength: 1.0 }} />;
}
