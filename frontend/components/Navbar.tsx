"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Drawer } from "@heroui/react";
import { useOverlayState } from "@heroui/react";
import { isAuthenticated, clearToken } from "@/lib/api";

const links = [
  { href: "/", label: "首页" },
  { href: "/gallery", label: "图库" },
  { href: "/albums", label: "相册" },
  { href: "/blog", label: "笔记" },
  { href: "/map", label: "足迹" },
  { href: "/equipment", label: "器材" },
];

const navFontStyle = { fontFamily: "'Noto Serif SC', serif", fontWeight: 600 };

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const drawerState = useOverlayState();

  useEffect(() => {
    setAuthed(isAuthenticated());
    drawerState.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const handleLogout = () => {
    clearToken();
    setAuthed(false);
    drawerState.close();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 isolate border-b border-border-subtle w-full glass-panel">
      <div className="flex items-center justify-between h-[64px] md:h-[72px] pl-0 pr-4 md:pr-grid-margin">
        <div className="w-28 md:w-36 flex items-center self-stretch">
          <Link
            href="/"
            className="flex-1 flex items-center justify-center text-xl md:text-2xl tracking-[-0.01em] text-primary leading-none whitespace-nowrap"
            style={{ fontFamily: "var(--font-sigma)" }}
          >
            Art
          </Link>
          <div className="w-px self-stretch bg-primary/20" />
        </div>

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={navFontStyle}
              className={`text-label-caps text-[16px] pb-1 transition-colors ${
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
            aria-label="搜索"
            className={`flex items-center justify-center w-9 h-9 transition-colors ${
              pathname === "/search" ? "text-primary" : "text-on-surface-variant hover:text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">search</span>
          </Link>

          {authed && (
            <Button variant="primary" size="sm" style={navFontStyle} onPress={handleLogout}>
              退出登录
            </Button>
          )}
        </div>

        <button
          onClick={drawerState.open}
          className="md:hidden relative z-[60] w-10 h-10 flex items-center justify-center text-primary active:bg-primary/10 pointer-fine:hover:bg-primary/5 transition-colors rounded-md"
          aria-label="打开菜单"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>
      </div>

      <Drawer.Backdrop isOpen={drawerState.isOpen} onOpenChange={drawerState.setOpen}>
        <Drawer.Content placement="right">
          <Drawer.Dialog>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="text-label-caps text-on-surface-variant">
                导航菜单
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col gap-1 pt-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    style={navFontStyle}
                    className={`px-3 py-3 text-[16px] rounded-lg transition-colors ${
                      pathname === link.href
                        ? "text-primary bg-primary/5 font-bold"
                        : "text-on-surface-variant hover:bg-black/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/search"
                  style={navFontStyle}
                  className="flex items-center gap-2 px-3 py-3 text-[16px] rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">search</span>
                  搜索
                </Link>
              </Drawer.Body>
              {authed && (
                <Drawer.Footer>
                  <Button fullWidth style={navFontStyle} onPress={handleLogout}>
                    退出登录
                  </Button>
                </Drawer.Footer>
              )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </nav>
  );
}
