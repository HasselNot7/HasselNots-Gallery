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

  // 移动端提不透明度：Footer 压在水纹画布的暗部上，bg-white/25 会让 #555 的链接几乎看不清
  return (
    <footer className="bg-white/25 max-md:bg-white/85 backdrop-blur-xl border-t border-border-subtle w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter px-4 md:px-grid-margin py-8 md:py-section-gap max-w-7xl mx-auto">
        <div className="md:col-span-2 flex flex-col gap-4">
          <span className="text-label-caps font-bold text-primary uppercase" style={{ fontFamily: "var(--font-sigma)" }}>{footer_title}</span>
          <p className="text-body-md text-on-surface-variant max-w-sm max-md:line-clamp-1 uppercase" style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', serif", whiteSpace: "pre-line" }}>
            {site_tagline.replace(/\\n/g, "\n")}
          </p>
          <span className="text-metadata-sm text-outline uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            {formatCopyright(footer_copyright, new Date().getFullYear())}
          </span>
        </div>

        {/* 移动端两组都横排换行：竖排 6 项要把整块 Footer 撑到超过半屏 */}
        <div className="col-span-1 flex flex-col gap-3 max-md:flex-row max-md:flex-wrap max-md:items-center max-md:gap-x-4 max-md:gap-y-2">
          <span className="text-label-caps text-secondary tracking-widest uppercase" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 600, fontSize: "12px" }}>导航</span>
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase max-md:inline-flex max-md:min-h-11 max-md:items-center" style={SERIF}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="col-span-1 flex flex-col gap-3 max-md:flex-row max-md:flex-wrap max-md:items-center max-md:gap-x-4 max-md:gap-y-2">
          <span className="text-label-caps text-secondary tracking-widest uppercase" style={{ fontFamily: "'Noto Serif SC', serif", fontWeight: 600, fontSize: "12px" }}>管理</span>
          <Link href="/login" className="text-metadata-sm text-on-surface-variant hover:text-primary transition-colors uppercase max-md:inline-flex max-md:min-h-11 max-md:items-center" style={SERIF}>
            登录
          </Link>
        </div>
      </div>
    </footer>
  );
}
