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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());
    setMenuOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    setMenuOpen(false);
    router.push("/");
  };

  const links = [
    { href: "/", label: "Home" },
    { href: "/gallery", label: "Gallery" },
    { href: "/albums", label: "Albums" },
    { href: "/blog", label: "Blog" },
    { href: "/map", label: "Footprints" },
    { href: "/equipment", label: "Gear" },
  ];

  return (
    <nav className="sticky top-0 z-50 isolate border-b border-border-subtle w-full glass-panel">
      {/* 顶栏 */}
      <div className="flex items-center justify-between h-[64px] md:h-[72px] pl-0 pr-4 md:pr-grid-margin">
        <div className="w-28 md:w-36 flex items-center self-stretch">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center text-xl md:text-2xl tracking-[-0.01em] text-primary leading-none whitespace-nowrap"
            style={{ fontFamily: "var(--font-sigma)" }}
          >
            Art        </Link>
          <div className="w-px self-stretch bg-primary/20" />
        </div>

        {/* 桌面端导航 */}
        <div className="hidden md:flex items-center gap-6">
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

          <Link
            href="/search"
            aria-label="Search"
            className={`flex items-center justify-center w-9 h-9 transition-colors ${
              pathname === "/search"
                ? "text-primary"
                : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
          </Link>

          {authed ? (
            <button onClick={handleLogout} style={{ fontFamily: "var(--font-sigma)" }} className="btn-outline !px-4 !py-2 whitespace-nowrap">
              Logout
            </button>
          ) : (
            <Link href="/login" style={{ fontFamily: "var(--font-sigma)" }} className="btn-outline !px-4 !py-2 whitespace-nowrap">
              Admin Login
            </Link>
          )}
        </div>

        {/* 移动端汉堡按钮 */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="md:hidden relative z-[60] w-10 h-10 flex items-center justify-center text-primary active:bg-primary/10 pointer-fine:hover:bg-primary/5 transition-colors rounded-md"
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-[24px]">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* 移动端折叠菜单 */}
      {menuOpen && (
        <div className="md:hidden border-t border-border-subtle bg-white/30 backdrop-blur-xl">
          <div className="flex flex-col px-4 py-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                style={{ fontFamily: "var(--font-sigma)" }}
                className={`px-3 py-3 text-[14px] transition-colors border-b border-border-subtle/50 last:border-0 ${
                  pathname === link.href
                    ? "text-primary font-bold"
                    : "text-on-surface-variant"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/search"
              className={`flex items-center gap-2 px-3 py-3 text-[14px] transition-colors border-b border-border-subtle/50 ${
                pathname === "/search"
                  ? "text-primary font-bold"
                  : "text-on-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">search</span>
              Search
            </Link>
            <div className="pt-3 pb-2">
              {authed ? (
                <button onClick={handleLogout} className="btn-outline w-full !py-3">
                  Logout
                </button>
              ) : (
                <Link href="/login" className="btn-outline w-full !py-3 text-center block">
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
