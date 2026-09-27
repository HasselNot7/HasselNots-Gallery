export interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  city?: string;
}

/** 结果副标题：市/区 → 省/州 → 国家，跳过重复层级。同名街道（南京路）全靠市/区这一层区分 */
export const placeContext = (r: GeoResult): string => {
  const out: string[] = [];
  for (const s of [r.city, r.admin1, r.country]) {
    // 「北京市, 北京」这种是同一级的两种写法，Photon 与 GeoNames 混用时很常见
    if (s && !out.some((x) => x === s || x.startsWith(s))) out.push(s);
  }
  return out.join(", ");
};

// Photon 的 type 字段粒度太粗：博物馆是 house、湖泊是 other、机场也是 house，按它过滤会把
// 想搜的东西全丢掉；osm_key/osm_value 才是可靠的判据。
const DROP_KEYS = new Set(["building", "information", "advertisment"]);
const DROP_PAIRS = new Set(["railway/stop", "highway/bus_stop"]);
// 小商业：不删（用户可能就是要找那家旅馆），但沉到列表末尾
const LOW_VALUE = new Set([
  "car_wash", "restaurant", "cafe", "fast_food", "bar", "pub", "motel",
  "massage", "fishing", "bank", "fuel", "pharmacy", "vending_machine",
]);
const SETTLEMENT_KEYS = new Set(["place", "boundary"]);
const DESTINATION_KEYS = new Set([
  "tourism", "historic", "natural", "leisure", "landuse", "man_made",
  "aeroway", "amenity", "waterway", "railway", "route",
]);

const rankOf = (key: string, value: string): number => {
  if (LOW_VALUE.has(value)) return 3;
  if (SETTLEMENT_KEYS.has(key)) return 0;
  if (key === "highway") return 2;
  return DESTINATION_KEYS.has(key) ? 1 : 2;
};

interface Hit extends GeoResult {
  rank: number;
  street: boolean;
}

async function searchOpenMeteo(q: string): Promise<Hit[]> {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=zh`
  );
  const data = await res.json();
  // 这个源只有居民点（GeoNames PPL*），没有 POI，所以一律算行政居民点档
  return (data.results || []).map((r: any) => ({
    name: r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    country: r.country,
    admin1: r.admin1,
    city: r.admin2,
    rank: 0,
    street: false,
  }));
}

async function searchPhoton(q: string): Promise<Hit[]> {
  const res = await fetch(
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8`
  );
  const data = await res.json();
  const out: Hit[] = [];
  for (const f of data.features || []) {
    const p = f.properties || {};
    const key = p.osm_key || "";
    const value = p.osm_value || "";
    if (!p.name || DROP_KEYS.has(key) || DROP_PAIRS.has(`${key}/${value}`)) continue;
    if (!f.geometry?.coordinates) continue;
    out.push({
      name: p.name,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      country: p.country,
      admin1: p.state,
      city: p.city || p.district || p.county,
      rank: rankOf(key, value),
      street: key === "highway",
    });
  }
  return out;
}

/** 多源地名搜索（Open-Meteo + Photon 合并去重，按目的地重要度排序） */
export async function searchPlaces(q: string): Promise<GeoResult[]> {
  const [a, b] = await Promise.allSettled([searchOpenMeteo(q), searchPhoton(q)]);
  const merged: Hit[] = [];
  const seen = new Set<string>();
  for (const hit of [...(a.status === "fulfilled" ? a.value : []), ...(b.status === "fulfilled" ? b.value : [])]) {
    const key = `${hit.latitude.toFixed(3)},${hit.longitude.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(hit);
  }
  // 街道只在「这次已经搜到居民点」时才垫底，否则搜「南京路」就只剩别的城市的地块
  const demoteStreets = merged.some((h) => h.rank === 0);
  const order = (h: Hit) => (demoteStreets && h.street ? 4 : h.rank);
  // Array#sort 稳定，同一档内保持 Photon/Open-Meteo 自己的相关度顺序
  return merged.sort((x, y) => order(x) - order(y)).slice(0, 8);
}
