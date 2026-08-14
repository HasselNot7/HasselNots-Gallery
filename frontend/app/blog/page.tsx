import { fetchArticles } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPage() {
  let articles: Awaited<ReturnType<typeof fetchArticles>> = [];
  try {
    articles = await fetchArticles();
  } catch {
    // backend unavailable
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-4xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-headline-lg md:text-display-lg text-primary mb-2 uppercase" style={{ fontFamily: "var(--font-sigma)" }}>
            Blog
          </h1>
          <span className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {articles.length} POST{articles.length === 1 ? "" : "S"}
          </span>
        </div>

        {articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4">article</span>
            <p className="text-headline-mobile text-on-surface-variant">No posts yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {articles.map((a) => (
              <a
                key={a.id}
                href={`/blog/${a.slug}`}
                className="group border border-border-subtle p-6 md:p-8 bg-surface hover:border-primary/40 transition-colors duration-300"
              >
                <div className="flex items-center justify-between mb-3 text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>{formatDate(a.created_at)}</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                    {a.views}
                  </span>
                </div>
                <h2 className="text-headline-lg text-primary mb-2 group-hover:text-primary-container transition-colors" style={{ fontFamily: "var(--font-sigma)" }}>
                  {a.title}
                </h2>
                {a.excerpt && (
                  <p className="text-body-md text-on-surface-variant mb-4">{a.excerpt}</p>
                )}
                {a.tags && (
                  <div className="flex flex-wrap gap-2">
                    {a.tags.split(",").filter(Boolean).map((t) => (
                      <span key={t} className="px-2 py-0.5 bg-mint-accent/20 border border-mint-accent text-label-caps text-primary rounded-md">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </a>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
