import { DEFAULT_MAP_CONFIG, type MapConfig } from "./map-config";

export interface TileLayerDef {
  name: string;
  /** 未填 {s} / {q} / {z} / {x} / {y} 之前的原始模板，不含任何密钥 */
  url: string;
  options: Record<string, unknown>;
  overlayUrls?: string[];
  /** 该图层需要 provider 的 API Key 才没有水印；key 由 attachLayerSwitcher 在运行期拼上 */
  needsKey?: boolean;
  /** 该图层的瓦片主机由站点配置决定，url/options 里的值只是默认那一档 */
  hostFromConfig?: boolean;
  /** 缩略图配色：迷你地图 SVG 预览 */
  thumb?: { bg: string; road: string; park?: string; water?: string; accent?: string };
}

const GAODE_SUB = ["webrd01", "webrd02", "webrd03", "webrd04"];
const GAODE_SAT_SUB = ["webst01", "webst02", "webst03", "webst04"];
/**
 * OSM Standard 的两套瓦片主机，与 backend/routes/services.py 的 OSM_SOURCES 逐字一致
 * （健康检查探的必须是这里真正在用的那台，否则又是"检测正常、用户看着空白"）。
 * 官方域名在中国大陆被 DNS 污染（A/AAAA 被打到 Meta 段），解析层面就挂，重试无意义。
 * 刻意不用 {s} 子域轮询：a/b/c/d.tile.openstreetmap.de 实测可用但分成两组后端，
 * 同一块瓦片回的字节日略有差，轮询会在相邻瓦片间看到渲染错位。
 */
const OSM_SOURCES: Record<string, string> = {
  de: "tile.openstreetmap.de",
  official: "tile.openstreetmap.org",
};
const OSM_DEFAULT_SOURCE = "de";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> / <a href="https://carto.com/">CARTO</a>';

function osmHostOf(source: string): string {
  return OSM_SOURCES[source] ?? OSM_SOURCES[OSM_DEFAULT_SOURCE];
}
/**
 * CARTO 子域轮询表。Leaflet 默认是 "abc"，但实测 a.basemaps.cartocdn.com 在本机
 * 解析到 157.240.12.36（Meta 的段）且 443 不可达，b/c 才落在 Fastly 199.232.114.132 ——
 * 按 "abc" 轮询会有三分之一瓦片直接失败。*.basemaps.cartocdn.com 是通配记录，
 * 三个标签背后同一个 Fastly 边缘，少轮询一个不损失什么。
 */
const CARTO_SUB = "bc";
const esriSat = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const esriRef = (layer: string) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/${layer}/MapServer/tile/{z}/{y}/{x}`;
const gaodeSat = (sub: string[]) =>
  `https://${sub[Math.floor(Math.random() * sub.length)]}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}`;

export const TILE_LAYERS: TileLayerDef[] = [
  {
    name: "Bing",
    url: "https://dynamic.t0.tiles.ditu.live.com/comp/ch/{q}?it=G,VE,BX,L,LA&mkt=zh-cn,syr&n=z&ur=CN",
    options: {
      attribution: "&copy; 必应地图",
      maxZoom: 19,
    },
    thumb: { bg: "#E3EBF6", road: "#FFFFFF", park: "#AFCFEA", water: "#7FAEDC", accent: "#4F7FB4" },
  },
  {
    name: "Bing Satellite",
    url: "https://ecn.t0.tiles.virtualearth.net/tiles/a{q}.jpeg?g=1",
    options: {
      attribution: "&copy; 必应地图",
      maxZoom: 19,
    },
    thumb: { bg: "#3A4A3A", road: "#5A6E5A", park: "#4A5E42", water: "#2E4A5E", accent: "#6E8A6A" },
  },
  {
    name: "Streets",
    // 默认档 = osm_tile_source "de"；实际主机在 attachLayerSwitcher 里按配置换
    hostFromConfig: true,
    url: `https://${OSM_SOURCES[OSM_DEFAULT_SOURCE]}/{z}/{x}/{y}.png`,
    options: {
      attribution: OSM_ATTRIBUTION,
      // 实测 .de 在密集区给到 z20（z21 起 404），但 z20 覆盖不全，留 19 不会出灰块
      maxZoom: 19,
    },
    thumb: { bg: "#F6EEDD", road: "#FFFDF6", park: "#D3DCAE", water: "#B8D4DE", accent: "#C29A55" },
  },
  {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    needsKey: true,
    options: {
      attribution: CARTO_ATTRIBUTION,
      maxZoom: 19,
      // 交给 Leaflet 轮询子域，不再把 {s} 手工换成字面量 "abc"（那只是蹭通配 DNS 能解析）
      subdomains: CARTO_SUB,
    },
    thumb: { bg: "#F7F7F7", road: "#FFFFFF", park: "#E9E9E9", water: "#DDE3E8", accent: "#BFBFBF" },
  },
  {
    name: "Satellite",
    url: esriSat,
    options: {
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      maxZoom: 19,
    },
    thumb: { bg: "#2B3A2E", road: "#44584A", park: "#37492F", water: "#1F3542", accent: "#5A7A60" },
  },
  {
    name: "Hybrid",
    url: gaodeSat(GAODE_SAT_SUB),
    options: {
      attribution: "&copy; 高德地图",
      maxZoom: 19,
    },
    overlayUrls: [
      esriRef("World_Transportation"),
      esriRef("World_Boundaries_and_Places"),
    ],
    thumb: { bg: "#33453A", road: "#F0F0EE", park: "#3D5235", water: "#1F3542", accent: "#A0A0A0" },
  },
  {
    name: "Gaode",
    url: `https://${GAODE_SUB[Math.floor(Math.random() * GAODE_SUB.length)]}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`,
    options: {
      attribution: "&copy; 高德地图",
      maxZoom: 19,
    },
    thumb: { bg: "#FAF1E7", road: "#FFFFFF", park: "#E8D8C2", water: "#BFD9E8", accent: "#EE7A22" },
  },
  {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    needsKey: true,
    options: {
      attribution: CARTO_ATTRIBUTION,
      maxZoom: 19,
      subdomains: CARTO_SUB,
    },
    thumb: { bg: "#24262B", road: "#3A3D44", park: "#2C3430", water: "#1C2230", accent: "#565B66" },
  },
  {
    // 追加在末尾而不是挨着 Light/Dark：访客侧 mapSkinName 存的是数组下标，
    // 插在中间会把已有记忆静默指到别的图层上；追加则老下标全部不变。
    name: "Voyager",
    // Voyager 只挂在 rastertiles/ 下，根路径 /voyager/ 实测 404（Light/Dark 两种都通）
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    needsKey: true,
    options: {
      attribution: CARTO_ATTRIBUTION,
      // 实测 z20 起返回 103 字节的空白瓦，真实覆盖到 19，与 Light/Dark 一致
      maxZoom: 19,
      subdomains: CARTO_SUB,
    },
    thumb: { bg: "#F3EEE3", road: "#FFFFFF", park: "#9FD89B", water: "#93CFE8", accent: "#E2703F" },
  },
];

/** 站点默认底图解析不到时的兜底图层名 */
export const FALLBACK_LAYER_NAME = "Hybrid";

/**
 * 把站点配置的图层名解析成 TILE_LAYERS 下标；名字对不上（改名、删层、脏数据）
 * 回退到 Hybrid，连 Hybrid 都没有才退到 0 —— 地图不能因为一条配置写错就白屏。
 *
 * 存名字而不是下标：下标会随数组增删静默错位，指到别的图层上还不报错。
 * 注意访客侧的 localStorage(SKIN_KEY) 存的**是数字下标**，这个不一致是故意的 ——
 * 那套本身自洽且已经躺在用户机器上，迁移只会留下新旧值混存的脏状态。
 */
export function resolveLayerIndex(name: string): number {
  const byName = TILE_LAYERS.findIndex((l) => l.name === name);
  if (byName >= 0) return byName;
  const fallback = TILE_LAYERS.findIndex((l) => l.name === FALLBACK_LAYER_NAME);
  return fallback >= 0 ? fallback : 0;
}

/** 生成迷你地图缩略图 SVG（模仿 anitabi 的方案缩略图风格）。后台「默认底图」选择器共用。 */
export function schemeThumb(t: TileLayerDef["thumb"]): string {
  const { bg, road, park = bg, water = bg, accent = road } = t || { bg: "#ccc", road: "#fff" };
  const svg = `
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'>
  <rect width='48' height='48' fill='${bg}'/>
  <path fill='${water}' d='M0,34h48v14H0V34z'/>
  <path fill='${park}' d='M4,26c6-3,8-1,10,1c2,2,4,3,7,3c4,0,8-4,10-6c2-2,5-4,7-4c2,0,4,1,5,2v-1c0-11-9-20-20-20S3,14,3,25v1H4z'/>
  <path fill='${road}' d='M0,16l10,4l4-1l8,5l6-1l20,7V8L22,0H0V16z'/>
  <path fill='${accent}' d='M20,4c0,3-2,5-5,6c-2,1-4,0-4-2c0-2,2-4,4-5C17,2,20,2,20,4z'/>
  <path fill='${accent}' d='M34,24c0,3-2,5-5,6c-2,1-4,0-4-2c0-2,2-4,4-5C31,22,34,22,34,24z'/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const LAYER_STYLE = `
  .map-scheme {
    position: relative;
    z-index: 1;
    margin: 0 0 8px 8px !important;
  }
  .map-scheme .current-scheme-btn {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 48px;
    height: 48px;
    padding: 0 2px 2px;
    border: none;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff var(--thumb) center / cover no-repeat;
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
    cursor: pointer;
    color: #ffffff;
    font-family: 'JetBrains Mono', 'Noto Serif SC', monospace;
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    text-align: center;
    line-height: 1.1;
    text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.6);
    box-sizing: border-box;
    position: relative;
  }
  .scheme-select-shadow {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 10000;
  }
  .scheme-select-shadow[data-hide="true"] { display: none; }
  .scheme-select-shadow .scheme-btn-list {
    position: fixed;
    z-index: 10001;
    display: flex;
    gap: 6px;
    padding: 8px;
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.25);
    max-width: calc(100vw - 16px);
    overflow-x: auto;
  }
  .scheme-select-shadow .scheme-btn-list .scheme-btn {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    width: 48px;
    height: 48px;
    padding: 0 2px 2px;
    border: none;
    border-radius: 6px;
    overflow: hidden;
    background: #ffffff var(--thumb) center / cover no-repeat;
    cursor: pointer;
    color: #ffffff;
    font-family: 'JetBrains Mono', 'Noto Serif SC', monospace;
    font-size: 7px;
    font-weight: 700;
    text-transform: uppercase;
    text-align: center;
    line-height: 1.1;
    text-shadow: 0 1px 3px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.6);
    box-sizing: border-box;
    flex-shrink: 0;
    position: relative;
  }
  .scheme-select-shadow .scheme-btn-list .scheme-btn[data-current="true"] {
    box-shadow: 0 0 0 2px #141414;
  }
  /* 需要 API Key 却还没配：方案缩略图角上挂一个 KEY 标，免得用户对着水印地图纳闷 */
  .scheme-btn[data-nokey="true"]::after,
  .current-scheme-btn[data-nokey="true"]::after {
    content: "KEY";
    position: absolute;
    top: 1px;
    right: 1px;
    padding: 0 3px;
    border-radius: 3px;
    background: var(--color-tertiary);
    color: var(--color-on-tertiary);
    font-size: 7px;
    line-height: 11px;
    letter-spacing: 0;
    text-shadow: none;
  }
  .scheme-key-note {
    position: absolute;
    top: 52px;
    right: 0;
    /* 必须是 width 而不是 max-width：包含块 .map-scheme 只有 48px 宽，
       绝对定位的 shrink-to-fit 会把提示压成一条竖排窄条 */
    width: 190px;
    padding: 4px 7px;
    border-radius: 6px;
    background: var(--color-deep-charcoal);
    color: var(--color-on-secondary);
    font-size: 10px;
    font-weight: 400;
    line-height: 1.45;
    text-shadow: none;
  }
  .scheme-key-note[data-hide="true"] { display: none; }
  @media (max-width: 767px) {
    .map-scheme { margin: 0 8px 8px 0 !important; }
    .scheme-key-note { top: auto; bottom: 52px; }
  }
`;

function tileToQuadkey(x: number, y: number, z: number): string {
  let qk = "";
  for (let i = z; i > 0; i--) {
    let digit = 0;
    const mask = 1 << (i - 1);
    if (x & mask) digit += 1;
    if (y & mask) digit += 2;
    qk += digit;
  }
  return qk;
}

/** 支持 {q}（quadkey）占位符的瓦片图层（Leaflet 核心不支持 {q}） */
function makeTileLayer(L: any, url: string, options: Record<string, unknown>) {
  if (!url.includes("{q}")) return L.tileLayer(url, options);
  const QuadKeyLayer = L.TileLayer.extend({
    getTileUrl(coords: any) {
      const q = tileToQuadkey(coords.x, coords.y, coords.z);
      return L.Util.template(url, L.Util.extend({ q }, this.options));
    },
  });
  return new QuadKeyLayer(options);
}

const SKIN_KEY = "mapSkinName";

/**
 * Attach a base-layer switcher (anitabi 风格：缩略图方案选择器）。
 * 选中方案记忆在 localStorage，移动端位于右下角。
 *
 * config.carto_api_key 只拼进瓦片 URL 的 query，绝不进 attribution（attribution 会被
 * Leaflet 原样注入 DOM 并显示在页面上），也不参与任何日志。
 */
export function attachLayerSwitcher(
  map: any,
  L: any,
  initialIndex = 0,
  config: MapConfig = DEFAULT_MAP_CONFIG
) {
  const apiKey = config.carto_api_key.trim();
  const osmHost = osmHostOf(config.osm_tile_source);
  const groups = TILE_LAYERS.map((def) => {
    let url = def.url;
    let options = def.options;
    if (def.hostFromConfig) {
      url = `https://${osmHost}/{z}/{x}/{y}.png`;
      options = {
        ...options,
        attribution:
          osmHost === OSM_SOURCES[OSM_DEFAULT_SOURCE]
            ? `${OSM_ATTRIBUTION} / 瓦片由 FOSSGIS 镜像提供`
            : OSM_ATTRIBUTION,
      };
    } else if (def.needsKey && apiKey) {
      url = `${url}?key=${encodeURIComponent(apiKey)}`;
    }
    const layers = [makeTileLayer(L, url, options)];
    (def.overlayUrls || []).forEach((u) => {
      layers.push(
        L.tileLayer(u, { maxZoom: 19, attribution: "", zIndex: 50 })
      );
    });
    return layers;
  });

  // 访客自己动过选择器就以他的存储为准，站点默认只管首次访问者 —— 这里 localStorage
  // 压过 initialIndex 是设计。后台「默认底图」面板里也把这句话写给了管理员。
  let active = initialIndex;
  try {
    const saved = localStorage.getItem(SKIN_KEY);
    if (saved !== null) {
      const idx = parseInt(saved, 10);
      if (!isNaN(idx) && idx >= 0 && idx < groups.length) active = idx;
    }
  } catch {
    // ignore
  }
  groups[active].forEach((l: any) => l.addTo(map));

  const styleEl = document.createElement("style");
  styleEl.textContent = LAYER_STYLE;
  document.head.appendChild(styleEl);

  const container = L.DomUtil.create("div", "leaflet-control");
  const wrap = document.createElement("div");
  wrap.className = "map-scheme";

  const currentBtn = document.createElement("button");
  currentBtn.className = "current-scheme-btn";
  currentBtn.style.setProperty("--thumb", `url("${schemeThumb(TILE_LAYERS[active].thumb)}")`);
  currentBtn.textContent = TILE_LAYERS[active].name;

  const keyNote = document.createElement("div");
  keyNote.className = "scheme-key-note";
  keyNote.textContent = "此底图需要 CARTO API Key，未配置时瓦片会带水印";

  /** 当前方案要不要提示缺 key。文案是常量，不含 key 值本身。 */
  const applyKeyHint = (index: number) => {
    const missing = !!TILE_LAYERS[index].needsKey && !apiKey;
    currentBtn.dataset.nokey = String(missing);
    keyNote.dataset.hide = String(!missing);
  };
  applyKeyHint(active);

  const shadow = document.createElement("div");
  shadow.className = "scheme-select-shadow";
  shadow.dataset.hide = "true";
  const list = document.createElement("div");
  list.className = "scheme-btn-list";
  TILE_LAYERS.forEach((def, i) => {
    const btn = document.createElement("button");
    btn.className = "scheme-btn";
    btn.dataset.scheme = String(i);
    btn.dataset.current = String(i === active);
    btn.dataset.nokey = String(!!def.needsKey && !apiKey);
    btn.style.setProperty("--thumb", `url("${schemeThumb(def.thumb)}")`);
    btn.textContent = def.name;
    btn.addEventListener("click", () => {
      if (i !== active) {
        groups[active].forEach((l: any) => map.removeLayer(l));
        groups[i].forEach((l: any) => l.addTo(map));
        active = i;
        currentBtn.style.setProperty("--thumb", `url("${schemeThumb(def.thumb)}")`);
        currentBtn.textContent = def.name;
        applyKeyHint(i);
        list.querySelectorAll(".scheme-btn").forEach((b) => {
          (b as HTMLElement).dataset.current = String((b as HTMLElement).dataset.scheme === String(i));
        });
        try {
          localStorage.setItem(SKIN_KEY, String(i));
        } catch {
          // ignore
        }
      }
      shadow.dataset.hide = "true";
    });
    list.appendChild(btn);
  });
  shadow.appendChild(list);

  currentBtn.addEventListener("click", () => {
    shadow.dataset.hide = "false";
    // 在按钮附近展开：默认按钮下方靠右对齐，空间不足时移到上方
    requestAnimationFrame(() => {
      const r = currentBtn.getBoundingClientRect();
      const listH = list.offsetHeight;
      const listW = list.offsetWidth;
      let top = r.bottom + 8;
      if (top + listH > window.innerHeight - 8) {
        top = Math.max(8, r.top - listH - 8);
      }
      const left = Math.max(8, Math.min(r.right - listW, window.innerWidth - listW - 8));
      list.style.left = `${left}px`;
      list.style.top = `${top}px`;
    });
  });
  shadow.addEventListener("click", (e) => {
    if (e.target === shadow) shadow.dataset.hide = "true";
  });

  wrap.appendChild(currentBtn);
  wrap.appendChild(keyNote);
  container.appendChild(wrap);
  document.body.appendChild(shadow);

  const isMobile =
    window.matchMedia("(max-width: 767px)").matches ||
    (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0);
  const control = new L.Control({
    position: isMobile ? "bottomright" : "topright",
  });
  control.onAdd = () => container;
  map.addControl(control);

  return groups;
}
