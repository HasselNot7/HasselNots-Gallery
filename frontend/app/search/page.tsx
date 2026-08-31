"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, Chip, SearchField, Spinner } from "@heroui/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getPhotoImageUrl } from "@/lib/api-server";

const MONO = "'JetBrains Mono', 'Noto Serif SC', monospace";

interface SearchPhoto {
  id: number;
  title: string;
  shoot_time: string | null;
  camera_model: string;
  location_name: string;
}

interface SearchArticle {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  tags: string;
  created_at: string;
}

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [photos, setPhotos] = useState<SearchPhoto[]>([]);
  const [articles, setArticles] = useState<SearchArticle[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (!query) {
      setPhotos([]);
      setArticles([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setPhotos(data.photos || []);
        setArticles(data.articles || []);
        setSearched(true);
      } catch {
        setPhotos([]);
        setArticles([]);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  const total = photos.length + articles.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-5xl mx-auto w-full">
        <div className="mb-10">
          <h1
            className="text-2xl md:text-3xl text-primary mb-6 uppercase"
            style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', serif" }}
          >
            搜索
          </h1>
          <SearchField
            value={q}
            onChange={setQ}
            className="w-full [&_.searchfield__group]:border-0 [&_.searchfield__group]:border-b-2 [&_.searchfield__group]:border-primary/20 [&_.searchfield__group]:bg-transparent [&_.searchfield__group]:rounded-none [&_.searchfield__group]:shadow-none [&_.searchfield__group]:px-0"
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input
                placeholder="搜索照片、笔记、地点、相机…"
                className="text-base md:text-lg py-2 placeholder:text-on-surface-variant/50"
                style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', serif" }}
                autoFocus
              />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-on-surface-variant py-8">
            <Spinner size="sm" />
            <span className="text-body-md" style={{ fontFamily: MONO }}>搜索中...</span>
          </div>
        )}

        {!loading && searched && (
          <>
            <div className="mb-8">
              <span className="text-metadata-sm text-outline" style={{ fontFamily: MONO }}>
                共 {total} 条结果 · &quot;{q.trim()}&quot;
              </span>
            </div>

            {photos.length > 0 && (
              <section className="mb-12">
                <h2 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-5 uppercase">
                  照片 · {photos.length}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos.map((p) => (
                    <Link
                      key={p.id}
                      href={`/photo/${p.id}`}
                      className="group relative aspect-square overflow-hidden border border-border-subtle bg-surface hover:border-primary/40 transition-colors rounded-lg"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getPhotoImageUrl(p.id, true)}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                        <p className="text-metadata-sm text-white truncate">{p.title}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {articles.length > 0 && (
              <section className="mb-12">
                <h2 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-5 uppercase">
                  笔记 · {articles.length}
                </h2>
                <div className="space-y-3">
                  {articles.map((a) => (
                    <Link key={a.id} href={`/blog/${a.slug}`} className="block">
                      <Card className="p-5 md:p-6 hover:border-primary/40 transition-colors">
                        <h3
                          className="text-body-lg text-primary mb-1"
                          style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', serif" }}
                        >
                          {a.title}
                        </h3>
                        {a.excerpt && (
                          <p className="text-body-md text-on-surface-variant line-clamp-2 mb-2">{a.excerpt}</p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {a.tags
                            .split(",")
                            .filter(Boolean)
                            .map((tag) => (
                              <Chip key={tag} size="sm" variant="soft">
                                <Chip.Label>{tag}</Chip.Label>
                              </Chip>
                            ))}
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {total === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">
                  search_off
                </span>
                <p className="text-headline-mobile text-on-surface-variant mb-1">没有找到相关内容</p>
                <p className="text-body-md text-on-surface-variant/70">
                  换个关键词试试 — 地点、相机、镜头或笔记标签
                </p>
              </div>
            )}
          </>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">
              search
            </span>
            <p className="text-body-md text-on-surface-variant">
              输入关键词即可搜索照片与笔记
            </p>
            <p className="text-metadata-sm text-outline mt-2" style={{ fontFamily: MONO }}>
              标题 · 地点 · 相机 · 镜头 · 标签
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
