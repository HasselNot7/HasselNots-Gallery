"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, getToken } from "@/lib/api";

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

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;
    let map: any = null;

    import("leaflet").then(({ default: L }) => {
      if (disposed || !containerRef.current) return;
      const el = containerRef.current;
      const start: [number, number] = initial ?? [35.8617, 104.1954]; // China default
      map = L.map(el).setView(start, initial ? 12 : 5);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:22px;height:22px;background:#163828;border-radius:50%;border:3px solid #d1e7d3;box-shadow:0 2px 8px rgba(0,0,0,0.35);cursor:grab;"></div>`,
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

      mapRef.current = map;
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
      {picked && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur border border-primary/20 px-3 py-1.5 text-metadata-sm text-primary shadow-md" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <span className="material-symbols-outlined text-[14px] align-middle mr-1">location_on</span>
          {picked[0].toFixed(5)}, {picked[1].toFixed(5)}
        </div>
      )}
    </div>
  );
}
