"use client";

import Link from "next/link";
import { useSiteConfig } from "@/lib/site-config";

const NAV_LINKS = [
  { href: "/", label: "首页" },
  { href: "/gallery", label: "图库" },
  { href: "/albums", label: "相册" },
  { href: "/blog", label: "笔记" },
  { href: "/map", label: "足迹" },
];

const SERIF = { fontFamily: "'Noto Serif SC', serif", fontWeight: 500 };

/** {year} 占位符替换为当前年份；模板里没写占位符就原样显示 */
const formatCopyright = (tpl: string, year: number) => tpl.replace(/\{year\}/g, String(year));

export default function Footer() {
  const { site_tagline, footer_title, footer_copyright } = useSiteConfig();

  return (
    <footer className="bg-white/25 backdrop-blur-xl border-t border-border-subtle w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-4 md:px-grid-margin py-12 md:py-section-gap max-w-7xl mx-auto">
        <div className="md:col-span-2 flex flex-col gap-4">
          <span className="text-label-caps font-bold text-primary uppercase" style={{ fontFamily: "var(--font-sigma)" }}>{footer_title}</span>
          <p className="text-body-md text-on-surface-variant max-w-sm uppercase" style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', serif", whiteSpace: "pre-line" }}>
            {site_tagline.replace(/\\n/g, "\n")}
          </p>
          <span className="text-metadata-sm text-outline uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            {formatCopyright(footer_copyright, new Date().getFullYear())}
          </span>
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <span className="text-label-caps text-secondary tracking-widest uppercase" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 600, fontSize: "12px" }}>导航</span>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={SERIF}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="col-span-1 flex flex-col gap-3">
          <span className="text-label-caps text-secondary tracking-widest uppercase" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 600, fontSize: "12px" }}>管理</span>
          <Link href="/login" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase" style={SERIF}>
            登录
          </Link>
        </div>
      </div>
    </footer>
  );
}
