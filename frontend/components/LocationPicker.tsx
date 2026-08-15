"use client";

import { useEffect, useRef, useState } from "react";
import { isAuthenticated, getToken } from "@/lib/api";
import { attachLayerSwitcher } from "@/lib/mapLayers";
import { searchPlaces, GeoResult } from "@/lib/geocode";

export default function LocationPicker({
  initial,
  onPick,
}: {
  initial: [number, number] | null;
  onPick: (coords: [number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [picked, setPicked] = useState<[number, number] | null>(initial);

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
        setResults(await searchPlaces(q.trim()));
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
    map.flyTo([r.latitude, r.longitude], 12, { duration: 1.2 });
    if (markerRef.current) markerRef.current.setLatLng([r.latitude, r.longitude]);
    setPicked([r.latitude, r.longitude]);
    onPick([r.latitude, r.longitude]);
    setResults([]);
    setShowResults(false);
    setQuery(r.name);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let map: any = null;

    import("leaflet").then(({ default: L }) => {
      if (disposed || !containerRef.current) return;
      const el = containerRef.current;
      const start: [number, number] = initial ?? [35.8617, 104.1954]; // China default
      map = L.map(el).setView(start, initial ? 12 : 5);
      mapRef.current = map;
      attachLayerSwitcher(map, L, 5);

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:22px;height:22px;background:#141414;border-radius:50%;border:3px solid #f8583a;box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:grab;"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const update = (latlng: any) => {
        const c: [number, number] = [latlng.lat, latlng.lng];
        setPicked(c);
        onPick(c);
      };

      markerRef.current = L.marker(initial ?? start, { icon, draggable: true }).addTo(map);
      markerRef.current.on("dragend", (e: any) => update(e.target.getLatLng()));
      map.on("click", (e: any) => {
        markerRef.current.setLatLng(e.latlng);
        update(e.latlng);
      });

      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => {
      disposed = true;
      if (mapRef.current) mapRef.current.remove();
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

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
                  <div className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                    {[r.admin1, r.country].filter(Boolean).join(", ")}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {picked && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur border border-primary/20 px-3 py-1.5 text-metadata-sm text-primary shadow-md" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
          <span className="material-symbols-outlined text-[14px] align-middle mr-1">location_on</span>
          {picked[0].toFixed(5)}, {picked[1].toFixed(5)}
        </div>
      )}
    </div>
  );
}
