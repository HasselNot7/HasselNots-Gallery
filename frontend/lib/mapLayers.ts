export interface TileLayerDef {
  name: string;
  url: string;
  options: Record<string, unknown>;
  overlayUrls?: string[];
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
    name: "Streets",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    },
  },
  {
    name: "Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> / <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    },
  },
  {
    name: "Satellite",
    url: gaodeSat(GAODE_SAT_SUB),
    options: {
      attribution: "&copy; 高德地图",
      maxZoom: 19,
    },
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
  },
  {
    name: "Gaode",
    url: `https://${GAODE_SUB[Math.floor(Math.random() * GAODE_SUB.length)]}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`,
    options: {
      attribution: "&copy; 高德地图",
      maxZoom: 19,
    },
  },
  {
    name: "Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    options: {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> / <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19,
    },
  },
];

const LAYER_STYLE = `
  .map-layer-switcher {
    background: rgba(248, 250, 248, 0.92);
    backdrop-filter: blur(8px);
    border: 1px solid #e2e8e2;
    border-radius: 8px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    box-shadow: 0 4px 12px rgba(22, 56, 40, 0.12);
  }
  .map-layer-switcher button {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: #727973;
    cursor: pointer;
    border-radius: 6px;
    transition: all 200ms;
    white-space: nowrap;
    text-align: left;
  }
  .map-layer-switcher button:hover { color: #141414; background: rgba(248, 88, 58, 0.12); }
  .map-layer-switcher button.active { color: #ffffff; background: #f8583a; font-weight: 700; }
`;

/**
 * Attach a base-layer switcher control (top-right) to a Leaflet map.
 * Returns the active layer so callers can keep a reference.
 */
export function attachLayerSwitcher(map: any, L: any, initialIndex = 0) {
  const groups = TILE_LAYERS.map((def) => {
    const url = def.url.includes("{s}")
      ? def.url.replace("{s}", "abc")
      : def.url;
    const layers = [L.tileLayer(url, def.options)];
    (def.overlayUrls || []).forEach((u) => {
      layers.push(
        L.tileLayer(u, { maxZoom: 19, attribution: "", zIndex: 50 })
      );
    });
    return layers;
  });

  let active = initialIndex;
  groups[active].forEach((l: any) => l.addTo(map));

  const styleEl = document.createElement("style");
  styleEl.textContent = LAYER_STYLE;
  document.head.appendChild(styleEl);

  const container = L.DomUtil.create("div", "leaflet-control");
  container.innerHTML = `<div class="map-layer-switcher">${TILE_LAYERS.map(
    (d, i) => `<button data-i="${i}" class="${i === active ? "active" : ""}">${d.name}</button>`
  ).join("")}</div>`;

  const buttons = Array.from(
    container.querySelectorAll("button") as NodeListOf<HTMLButtonElement>
  );
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const i = parseInt(btn.dataset.i || "0", 10);
      if (i === active) return;
      groups[active].forEach((l: any) => map.removeLayer(l));
      groups[i].forEach((l: any) => l.addTo(map));
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      active = i;
    });
  });

  const control = new L.Control({ position: "topright" });
  control.onAdd = () => container;
  map.addControl(control);

  return groups;
}
