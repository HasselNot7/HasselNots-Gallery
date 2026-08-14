const API_BASE = "http://127.0.0.1:8001";

const IMG_BASE = "";

export interface Photo {
  id: number;
  filename: string;
  original_filename: string;
  title: string;
  description: string;
  shoot_time: string | null;
  camera_model: string;
  lens_model: string;
  focal_length: string;
  aperture: string;
  shutter_speed: string;
  iso: string;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  location_name: string;
  original_latitude: number | null;
  original_longitude: number | null;
  image_width: number;
  image_height: number;
  views: number;
  album_id: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Album {
  id: number;
  slug: string;
  title: string;
  description: string;
  cover_photo_id: number | null;
  photo_count: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  photo_id: number | null;
  article_id: number | null;
  author: string;
  content: string;
  created_at: string;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  content_md: string;
  content_html: string;
  excerpt: string;
  tags: string;
  cover_photo_id: number | null;
  views: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export function getPhotoImageUrl(id: number, thumb: boolean = false): string {
  const endpoint = thumb ? "thumbnail" : "image";
  return `${IMG_BASE}/api/photos/${id}/${endpoint}`;
}

export async function fetchPhotos(
  publishedOnly: boolean = true,
  skip: number = 0,
  limit: number = 12,
): Promise<{ items: Photo[]; total: number }> {
  const res = await fetch(`${API_BASE}/api/photos?published_only=${publishedOnly}&skip=${skip}&limit=${limit}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchGeotaggedPhotos(): Promise<Photo[]> {
  const res = await fetch(`${API_BASE}/api/photos/geotagged`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchPhoto(id: number): Promise<Photo> {
  const res = await fetch(`${API_BASE}/api/photos/${id}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchArticles(): Promise<Article[]> {
  const res = await fetch(`${API_BASE}/api/articles?published_only=true`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchArticle(slug: string): Promise<Article> {
  const res = await fetch(`${API_BASE}/api/articles/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAlbums(): Promise<Album[]> {
  const res = await fetch(`${API_BASE}/api/albums?published_only=true`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchAlbumPhotos(albumId: number): Promise<Photo[]> {
  const res = await fetch(
    `${API_BASE}/api/photos?published_only=true&album_id=${albumId}&skip=0&limit=100`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).items;
}

export interface SiteSettings {
  hero_title: string;
  hero_description: string;
  hero_icon: string;
  hero_icon_url: string;
  bg_color1: string;
  bg_color2: string;
  bg_color3: string;
  bg_color4: string;
  bg_color5: string;
  bg_color6: string;
  bg_base: string;
}

export async function fetchSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${API_BASE}/api/settings`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return {
      hero_title: "Precision Capture.\nTimeless Frames.",
      hero_description: "A curated collection of photographic works — each frame capturing the interplay of light, geometry, and fleeting moments across the globe.",
      hero_icon: "photo_camera",
      hero_icon_url: "",
      bg_color1: "#f8583a",
      bg_color2: "#141414",
      bg_color3: "#f5c9c0",
      bg_color4: "#0a0e27",
      bg_color5: "#ff9c8a",
      bg_color6: "#1c1c1c",
      bg_base: "#141414",
    };
  }
}
