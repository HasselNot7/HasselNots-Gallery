import { fetchPhotos, fetchArticles } from "@/lib/api-server";
import type { MetadataRoute } from "next";

import { SITE_URL as BASE } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/gallery`, priority: 0.9 },
    { url: `${BASE}/blog`, priority: 0.8 },
    { url: `${BASE}/map`, priority: 0.7 },
  ];

  try {
    const photos = await fetchPhotos(true, 0, 100);
    entries.push(
      ...photos.items.map((p) => ({
        url: `${BASE}/photo/${p.id}`,
        lastModified: p.updated_at,
        priority: 0.6,
      }))
    );
  } catch {
    // backend unavailable
  }

  try {
    const articles = await fetchArticles();
    entries.push(
      ...articles.map((a) => ({
        url: `${BASE}/blog/${a.slug}`,
        lastModified: a.updated_at,
        priority: 0.8,
      }))
    );
  } catch {
    // backend unavailable
  }

  return entries;
}
