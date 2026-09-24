export interface MapConfig {
  carto_api_key: string;
  /** "de" = tile.openstreetmap.de 镜像，"official" = tile.openstreetmap.org */
  osm_tile_source: string;
  /** 图层名（不是下标），解析不到时前端回退到 DEFAULT_MAP_LAYER_NAME */
  default_map_layer: string;
}

/**
 * 取不到配置时的兜底，与 backend/defaults.py 逐字一致。
 * OSM 默认走 .de 镜像：官方域名在中国大陆被 DNS 污染，解析层面就挂，重试无意义。
 */
export const DEFAULT_MAP_CONFIG: MapConfig = {
  carto_api_key: "",
  osm_tile_source: "de",
  default_map_layer: "Hybrid",
};

let cached: MapConfig | null = null;
let inflight: Promise<MapConfig> | null = null;

/**
 * 浏览器运行时需要的地图配置（目前只有 CARTO 底图 key）。
 *
 * 模块级缓存 + 单飞：页面上可能同时建两张地图（足迹页、照片详情页、选点器），
 * 只应该发一次请求。失败时清掉 in-flight 让下一张地图有机会重试，
 * 服务端本身带 Cache-Control: public, max-age=60，重复请求很便宜。
 */
export function fetchMapConfig(): Promise<MapConfig> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = fetch("/api/map-config")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as MapConfig;
      })
      .then((cfg) => {
        cached = cfg;
        inflight = null;
        return cfg;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}
