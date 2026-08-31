import { fetchArticle, getPhotoImageUrl } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ViewCounter from "@/components/ViewCounter";
import CommentSection from "@/components/CommentSection";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const article = await fetchArticle(slug);
    return {
      title: article.title,
      description: article.excerpt || undefined,
      openGraph: {
        title: article.title,
        description: article.excerpt || undefined,
        type: "article",
      },
    };
  } catch {
    return { title: "Article" };
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let article: Awaited<ReturnType<typeof fetchArticle>> | null = null;
  try {
    article = await fetchArticle(slug);
  } catch {
    // not found
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-headline-mobile text-on-surface-variant">Article not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  const coverUrl = article.cover_photo_id ? getPhotoImageUrl(article.cover_photo_id) : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-3xl mx-auto w-full">
        <a
          href="/blog"
          className="inline-flex items-center gap-2 text-label-caps text-on-surface-variant hover:text-primary transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Blog
        </a>

        <div className="mb-8">
          <h1 className="text-headline-lg md:text-display-lg text-primary mb-4" style={{ fontFamily: "var(--font-display)" }}>
            {article.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
            <span>{formatDate(article.created_at)}</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">visibility</span>
              {article.views}
            </span>
            {article.tags && (
              <div className="flex flex-wrap gap-2">
                {article.tags.split(",").filter(Boolean).map((t) => (
                  <span key={t} className="px-2 py-0.5 bg-mint-accent/20 border border-mint-accent text-label-caps text-primary rounded-md">
                    {t.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {coverUrl && (
          <div className="border border-border-subtle overflow-hidden mb-8">
            <img src={coverUrl} alt={article.title} className="w-full h-auto object-cover max-h-[420px]" />
          </div>
        )}

        <article
          className="prose prose-neutral max-w-none prose-headings:font-sigma prose-headings:text-primary prose-a:text-primary prose-img:rounded-md"
          dangerouslySetInnerHTML={{ __html: article.content_html }}
        />

        <div className="mt-12 pt-6 border-t border-border-subtle flex items-center justify-between text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
          <span>{article.slug}</span>
          <ViewCounter kind="article" slug={article.slug} currentViews={article.views} />
        </div>

        <CommentSection articleId={String(article.id)} title={`Comments (${article.title})`} />
      </main>
      <Footer />
    </div>
  );
}
