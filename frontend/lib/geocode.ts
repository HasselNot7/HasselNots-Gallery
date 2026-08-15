export interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

const PLACE_TYPES = new Set([
  "city", "town", "village", "county", "state", "locality",
  "municipality", "administrative", "country", "district", "suburb",
]);

async function searchOpenMeteo(q: string): Promise<GeoResult[]> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=zh`
  );
  const data = await res.json();
  return (data.results || []).map((r: any) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
  }));
}

async function searchPhoton(q: string): Promise<GeoResult[]> {
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`
  );
  const data = await res.json();
  const out: GeoResult[] = [];
  for (const f of data.features || []) {
    const p = f.properties || {};
    if (p.type && !PLACE_TYPES.has(p.type)) continue;
    if (!f.geometry?.coordinates) continue;
    out.push({
      name: p.name || "",
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      country: p.country,
      admin1: p.state || p.city,
    });
  }
  return out.filter((r) => r.name);
}

/** 多源地名搜索（Open-Meteo + Photon 合并去重） */
export async function searchPlaces(q: string): Promise<GeoResult[]> {
  const [a, b] = await Promise.allSettled([searchOpenMeteo(q), searchPhoton(q)]);
  const merged: GeoResult[] = [];
  const seen = new Set<string>();
  for (const r of a.status === "fulfilled" ? a.value : []) {
    const key = `${r.latitude.toFixed(3)},${r.longitude.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }
  for (const r of b.status === "fulfilled" ? b.value : []) {
    const key = `${r.latitude.toFixed(3)},${r.longitude.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }
  return merged.slice(0, 8);
}
