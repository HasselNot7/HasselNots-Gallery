"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthenticated, clearToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    router.push("/");
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/gallery", label: "Gallery" },
    { href: "/map", label: "Footprints" },
  ];

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border-subtle h-[64px] md:h-[72px] px-4 md:px-grid-margin w-full glass-panel">
      <Link
        href="/"
        className="text-lg md:text-headline-lg tracking-[-0.01em] text-primary leading-none whitespace-nowrap"
        style={{ fontFamily: "var(--font-sigma)" }}
      >
        Art      </Link>

      <div className="flex items-center gap-3 md:gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`text-label-caps pb-1 transition-colors ${
              pathname === link.href
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {link.label}
          </Link>
        ))}

        {authed ? (
          <button onClick={handleLogout} className="btn-outline !px-2 md:!px-4 !py-1 md:!py-2 whitespace-nowrap">
            Logout
          </button>
        ) : (
          <Link href="/login" className="btn-outline !px-2 md:!px-4 !py-1 md:!py-2 whitespace-nowrap">
            <span className="hidden sm:inline">Admin Login</span>
            <span className="sm:hidden">Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
