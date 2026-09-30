/**
 * WGS-84（GPS/EXIF 原始坐标）与 GCJ-02（国测局「火星坐标」）互转。
 *
 * 高德系的瓦片把同一块地面画在 GCJ-02 的网格位置上，所以直接把 GPS 坐标丢给
 * Leaflet 落在高德底图上，会在境内偏出几百米（三亚约 480m、长沙约 660m）。
 * 境外两套坐标重合，函数原样返回。
 *
 * 参数与返回值都是 [lat, lng]，跟 Leaflet 的 latlng 数组同序，省掉一次转置。
 */
export type Datum = "wgs84" | "gcj02";

const PI = Math.PI;
/** 克拉索夫斯基 1940 椭球，GCJ-02 偏移量就按它算的 */
const SEMI_MAJOR = 6378245.0;
const ECCENTRICITY_SQ = 0.00669342162296594323;

const outsideChina = (lng: number, lat: number) =>
  !(72.004 < lng && lng < 137.8347 && 0.8293 < lat && lat < 55.8271);

const dLat = (x: number, y: number) => {
  let r = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  r += ((20 * Math.sin(y * PI) + 40 * Math.sin((y / 3) * PI)) * 2) / 3;
  r += ((160 * Math.sin((y / 12) * PI) + 320 * Math.sin((y * PI) / 30)) * 2) / 3;
  return r;
};

const dLng = (x: number, y: number) => {
  let r = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  r += ((20 * Math.sin(6 * x * PI) + 20 * Math.sin(2 * x * PI)) * 2) / 3;
  r += ((20 * Math.sin(x * PI) + 40 * Math.sin((x / 3) * PI)) * 2) / 3;
  r += ((150 * Math.sin((x / 12) * PI) + 300 * Math.sin((x / 30) * PI)) * 2) / 3;
  return r;
};

/** WGS-84 -> GCJ-02 */
export function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  if (outsideChina(lng, lat)) return [lat, lng];
  const x = lng - 105;
  const y = lat - 35;
  let dl = dLat(x, y);
  let dg = dLng(x, y);
  const radLat = (lat / 180) * PI;
  let magic = Math.sin(radLat);
  magic = 1 - ECCENTRICITY_SQ * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dl = (dl * 180) / (((SEMI_MAJOR * (1 - ECCENTRICITY_SQ)) / (magic * sqrtMagic)) * PI);
  dg = (dg * 180) / ((SEMI_MAJOR / sqrtMagic) * Math.cos(radLat) * PI);
  return [lat + dl, lng + dg];
}

/**
 * GCJ-02 -> WGS-84。正向式没有闭式反解，用迭代收敛：
 * 拿目标值当猜测，每次按「正算结果差多少」回补，两轮就进到 1e-7 度（约 1cm）以内。
 */
export function gcj02ToWgs84(lat: number, lng: number): [number, number] {
  if (outsideChina(lng, lat)) return [lat, lng];
  let guessLat = lat;
  let guessLng = lng;
  for (let i = 0; i < 3; i++) {
    const [tLat, tLng] = wgs84ToGcj02(guessLat, guessLng);
    guessLat += lat - tLat;
    guessLng += lng - tLng;
  }
  return [guessLat, guessLng];
}

/** 按基准把 WGS-84 投到底图坐标上 */
export function fromWgs(lat: number, lng: number, datum: Datum): [number, number] {
  return datum === "gcj02" ? wgs84ToGcj02(lat, lng) : [lat, lng];
}

/** 按基准把底图坐标还原成 WGS-84 */
export function toWgs(lat: number, lng: number, datum: Datum): [number, number] {
  return datum === "gcj02" ? gcj02ToWgs84(lat, lng) : [lat, lng];
}
