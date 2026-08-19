"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
            className="text-headline-lg md:text-display-lg text-primary mb-6 uppercase"
            style={{ fontFamily: "var(--font-sigma)" }}
          >
            Search
          </h1>
          <div className="flex items-center gap-3 border-b-2 border-primary/20 focus-within:border-primary transition-colors pb-3">
            <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
              search
            </span>
            <input
              ref={inputRef}
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Photos, articles, locations, cameras..."
              className="flex-1 bg-transparent outline-none text-body-lg md:text-headline-mobile text-primary placeholder:text-on-surface-variant/50"
              style={{ fontFamily: "var(--font-sigma)" }}
            />
            {q && (
              <button
                onClick={() => setQ("")}
                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
                aria-label="Clear"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 text-on-surface-variant py-8">
            <span className="material-symbols-outlined text-[24px] animate-spin">progress_activity</span>
            <span className="text-body-md" style={{ fontFamily: MONO }}>SEARCHING...</span>
          </div>
        )}

        {!loading && searched && (
          <>
            <div className="mb-8">
              <span className="text-metadata-sm text-outline" style={{ fontFamily: MONO }}>
                {total} RESULT{total === 1 ? "" : "S"} FOR &quot;{q.trim()}&quot;
              </span>
            </div>

            {photos.length > 0 && (
              <section className="mb-12">
                <h2 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-5 uppercase">
                  Photos · {photos.length}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {photos.map((p) => (
                    <Link
                      key={p.id}
                      href={`/photo/${p.id}`}
                      className="group relative aspect-square overflow-hidden border border-border-subtle bg-surface hover:border-primary/40 transition-colors"
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
                  Articles · {articles.length}
                </h2>
                <div className="space-y-3">
                  {articles.map((a) => (
                    <Link
                      key={a.id}
                      href={`/blog/${a.slug}`}
                      className="block border border-border-subtle p-5 md:p-6 bg-surface hover:border-primary/40 transition-colors"
                    >
                      <h3
                        className="text-body-lg text-primary mb-1"
                        style={{ fontFamily: "var(--font-sigma)" }}
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
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-label-caps text-primary rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>
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
                <p className="text-headline-mobile text-on-surface-variant mb-1">No results found</p>
                <p className="text-body-md text-on-surface-variant/70">
                  Try different keywords — location, camera, or article tags
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
              Type to search photos & articles
            </p>
            <p className="text-metadata-sm text-outline mt-2" style={{ fontFamily: MONO }}>
              TITLE · LOCATION · CAMERA · LENS · TAGS
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
