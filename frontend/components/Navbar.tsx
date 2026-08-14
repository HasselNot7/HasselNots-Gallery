"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthenticated, clearToken } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

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
    { href: "/albums", label: "Albums" },
    { href: "/blog", label: "Blog" },
    { href: "/map", label: "Footprints" },
  ];

  return (
    <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border-subtle h-[64px] md:h-[72px] pl-0 pr-4 md:pr-grid-margin w-full glass-panel">
      <div className="w-28 md:w-36 flex items-center self-stretch">
        <Link
          href="/"
          className="flex-1 flex items-center justify-center text-xl md:text-2xl tracking-[-0.01em] text-primary leading-none whitespace-nowrap"
          style={{ fontFamily: "var(--font-sigma)" }}
        >
          Art        </Link>
        <div className="w-px self-stretch bg-primary/20" />
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        <ThemeToggle />
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{ fontFamily: "var(--font-sigma)" }}
            className={`text-label-caps text-[12px] pb-1 transition-colors ${
              pathname === link.href
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            {link.label}
          </Link>
        ))}

        {authed ? (
          <button onClick={handleLogout} style={{ fontFamily: "var(--font-sigma)" }} className="btn-outline !px-2 md:!px-4 !py-1 md:!py-2 whitespace-nowrap">
            Logout
          </button>
        ) : (
          <Link href="/login" style={{ fontFamily: "var(--font-sigma)" }} className="btn-outline !px-2 md:!px-4 !py-1 md:!py-2 whitespace-nowrap">
            <span className="hidden sm:inline">Admin Login</span>
            <span className="sm:hidden">Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
