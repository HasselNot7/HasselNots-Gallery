const API_BASE = "";

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetcher<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...init } = options;
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, { ...init, headers });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `HTTP ${res.status}`);
  }

  return res.json();
}

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
  image_width: number;
  image_height: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export function getPhotoImageUrl(id: number, thumb: boolean = false): string {
  const endpoint = thumb ? "thumbnail" : "image";
  return `${API_BASE}/api/photos/${id}/${endpoint}`;
}

export async function fetchPhotos(publishedOnly: boolean = true): Promise<Photo[]> {
  const all: Photo[] = [];
  const pageSize = 100;
  let skip = 0;
  for (;;) {
    const data = await fetcher<{ items: Photo[]; total: number }>(
      `/api/photos?published_only=${publishedOnly}&skip=${skip}&limit=${pageSize}`
    );
    all.push(...data.items);
    if (all.length >= data.total) break;
    skip += pageSize;
  }
  return all;
}

export async function fetchGeotaggedPhotos(): Promise<Photo[]> {
  return fetcher<Photo[]>("/api/photos/geotagged");
}

export async function fetchPhoto(id: number): Promise<Photo> {
  return fetcher<Photo>(`/api/photos/${id}`);
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error("Invalid credentials");
  }
  return res.json();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gallery_token");
}

export function setToken(token: string) {
  localStorage.setItem("gallery_token", token);
}

export function clearToken() {
  localStorage.removeItem("gallery_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
