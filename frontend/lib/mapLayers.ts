export interface TileLayerDef {
  name: string;
  url: string;
  options: Record<string, unknown>;
  overlayUrls?: string[];
  /** 缩略图配色：迷你地图 SVG 预览 */
  thumb?: { bg: string; road: string; park?: string; water?: string; accent?: string };
}

const GAODE_SUB = ["webrd01", "webrd02", "webrd03", "webrd04"];
const GAODE_SAT_SUB = ["webst01", "webst02", "webst03", "webst04"];
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
    thumb: { bg: "#E8ECF3", road: "#FFFFFF", park: "#B9D8B2", water: "#A8C8E8", accent: "#7A9BC8" },
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
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
    thumb: { bg: "#F2EFE9", road: "#FFFFFF", park: "#CDE8C9", water: "#AAD3DF", accent: "#D9C99A" },
  },
  {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> / <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    },
    thumb: { bg: "#F8F8F6", road: "#FFFFFF", park: "#E4F0E0", water: "#D6E8F2", accent: "#CCCCCC" },
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
    thumb: { bg: "#33453A", road: "#F0F0EE", park: "#3D5235", water: "#1F3542", accent: "#F8583A" },
  },
  {
    name: "Gaode",
    url: `https://${GAODE_SUB[Math.floor(Math.random() * GAODE_SUB.length)]}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`,
    options: {
      attribution: "&copy; 高德地图",
      maxZoom: 19,
    },
    thumb: { bg: "#F2EFE9", road: "#FFFFFF", park: "#C9E8C5", water: "#A8D0E8", accent: "#F8B080" },
  },
  {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> / <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    },
    thumb: { bg: "#24262B", road: "#3A3D44", park: "#2C3430", water: "#1C2230", accent: "#565B66" },
  },
];

/** 生成迷你地图缩略图 SVG（模仿 anitabi 的方案缩略图风格） */
function schemeThumb(t: TileLayerDef["thumb"]): string {
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
    box-shadow: 0 0 0 2px #f8583a;
  }
  @media (max-width: 767px) {
    .map-scheme { margin: 0 8px 8px 0 !important; }
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
 */
export function attachLayerSwitcher(map: any, L: any, initialIndex = 0) {
  const groups = TILE_LAYERS.map((def) => {
    const url = def.url.includes("{s}")
      ? def.url.replace("{s}", "abc")
      : def.url;
    const layers = [makeTileLayer(L, url, def.options)];
    (def.overlayUrls || []).forEach((u) => {
      layers.push(
        L.tileLayer(u, { maxZoom: 19, attribution: "", zIndex: 50 })
      );
    });
    return layers;
  });

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
    btn.style.setProperty("--thumb", `url("${schemeThumb(def.thumb)}")`);
    btn.textContent = def.name;
    btn.addEventListener("click", () => {
      if (i !== active) {
        groups[active].forEach((l: any) => map.removeLayer(l));
        groups[i].forEach((l: any) => l.addTo(map));
        active = i;
        currentBtn.style.setProperty("--thumb", `url("${schemeThumb(def.thumb)}")`);
        currentBtn.textContent = def.name;
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
