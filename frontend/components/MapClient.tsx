"use client";

import { useEffect, useRef, useState } from "react";
import { attachLayerSwitcher } from "@/lib/mapLayers";
import { yearColor, yearOf } from "@/lib/mapYears";

interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  thumbnail: string;
  camera: string;
  shoot_time?: string;
}

interface GeoResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export default function MapClient({ markers, center }: { markers: MapMarker[]; center: [number, number] }) {
  const mapRef = useRef<any>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    setShowResults(true);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q.trim())}&count=6&language=zh`
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const jumpTo = (r: GeoResult) => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo([r.latitude, r.longitude], 10, { duration: 1.2 });
    setResults([]);
    setShowResults(false);
    setQuery(r.name);

    // 临时搜索标记（薄荷色），与其他摄影标记区分
    const L = (window as any).L;
    if (map._searchMarker) map.removeLayer(map._searchMarker);
    const icon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:20px;height:20px;background:#2b2b2b;border-radius:50%;border:3px solid #f8583a;box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    const label = [r.name, r.admin1, r.country].filter(Boolean).join(", ");
    map._searchMarker = L.marker([r.latitude, r.longitude], { icon }).addTo(map);
    map._searchMarker.bindPopup(
      `<div style="font-family:Inter,sans-serif;font-size:13px;color:#141414;padding:2px 4px;"><strong>${r.name}</strong><br/><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#727973;">${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)}</span><br/><span style="font-size:11px;color:#727973;">${label}</span></div>`
    ).openPopup();
  };

  useEffect(() => {
    let map: any;
    import("leaflet").then(({ default: L }) => {
      const mapContainer = document.getElementById("leaflet-map");
      if (!mapContainer || (mapContainer as any)._leaflet_id) return;

      map = L.map("leaflet-map").setView(center, markers.length === 1 ? 12 : 5);
      mapRef.current = map;
      attachLayerSwitcher(map, L, 0);

      const bounds: [number, number][] = [];

      // Group markers by coordinate (rounded to 4 decimals)
      const groups = new Map<string, MapMarker[]>();
      markers.forEach((m) => {
        const key = `${m.latitude.toFixed(4)},${m.longitude.toFixed(4)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(m);
      });

      groups.forEach((group) => {
        const lat = group[0].latitude;
        const lng = group[0].longitude;
        bounds.push([lat, lng]);

        const count = group.length;
        // 取组内最新拍摄年份作为标记颜色
        let year: number | null = null;
        group.forEach((m) => {
          const y = yearOf(m.shoot_time);
          if (y !== null && (year === null || y > year)) year = y;
        });
        const color = year !== null ? yearColor(year) : "#141414";
        const ring = "#f8faf8";

        const icon = L.divIcon({
          className: "custom-marker",
          html:
            count > 1
              ? `<div style="width:22px;height:22px;background:${color};color:#fff;border-radius:50%;border:2px solid ${ring};box-shadow:0 2px 4px rgba(0,0,0,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;">${count}</div>`
              : `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid ${ring};box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:pointer;"></div>`,
          iconSize: count > 1 ? [22, 22] : [12, 12],
          iconAnchor: count > 1 ? [11, 11] : [6, 6],
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);

        const photosHtml = group
          .map(
            (m) => `
            <div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #eef1ee;align-items:center;">
              <a href="/photo/${m.id}" style="flex-shrink:0;width:56px;height:56px;overflow:hidden;border:1px solid #e2e8e2;display:block;">
                <img src="${m.thumbnail}" alt="${m.title}" style="width:100%;height:100%;object-fit:cover;" />
              </a>
              <div style="min-width:0;">
                <a href="/photo/${m.id}" style="font-size:13px;font-weight:500;color:#141414;text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.title}</a>
                ${m.camera ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#727973;margin-top:2px;">${m.camera}</div>` : ""}
              </div>
            </div>`
          )
          .join("");

        marker.bindPopup(
          `<div style="font-family:Inter,sans-serif;max-width:240px;">
            <div style="display:flex;align-items:center;gap:6px;padding:8px 0 4px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#727973;letter-spacing:0.05em;text-transform:uppercase;">
              <span style="width:6px;height:6px;border-radius:50%;background:#141414;display:inline-block;"></span>
              ${count} photo${count > 1 ? "s" : ""} at this location
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#727973;padding-bottom:4px;">${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
            ${photosHtml}
          </div>`,
          { maxWidth: 260, maxHeight: 320 }
        );
      });

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [50, 50] });

      // Ensure correct sizing after mount (mobile layouts, late CSS, etc.)
      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 300);
    });

    return () => {
      if (map) map.remove();
      if (mapRef.current === map) mapRef.current = null;
    };
  }, [markers, center]);

  return (
    <div className="relative w-full h-full">
      <div id="leaflet-map" className="w-full h-full" />
      {/* 地名搜索框 */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[600] w-64 max-w-[80%]">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline pointer-events-none">search</span>
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results.length > 0) jumpTo(results[0]);
            }}
            placeholder="Search places..."
            className="w-full bg-surface/95 backdrop-blur border border-border-subtle pl-10 pr-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary shadow-md rounded-md"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                setShowResults(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-outline hover:text-primary rounded-md"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        {showResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-surface/95 backdrop-blur border border-border-subtle shadow-lg overflow-hidden rounded-md z-[700]">
            {searching ? (
              <div className="px-4 py-3 text-metadata-sm text-outline">Searching...</div>
            ) : results.length === 0 ? (
              query.trim() && (
                <div className="px-4 py-3 text-metadata-sm text-outline">No places found</div>
              )
            ) : (
              results.map((r, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => jumpTo(r)}
                  className="w-full text-left px-4 py-2.5 hover:bg-mint-accent/30 transition-colors border-b border-border-subtle last:border-0"
                >
                  <div className="text-body-md text-on-surface leading-tight">{r.name}</div>
                  <div className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {[r.admin1, r.country].filter(Boolean).join(", ")}
                    <span className="ml-2">{r.latitude.toFixed(3)}, {r.longitude.toFixed(3)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
