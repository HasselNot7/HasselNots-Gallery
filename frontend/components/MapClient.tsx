"use client";

import { useEffect } from "react";
import { attachLayerSwitcher } from "@/lib/mapLayers";

interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  thumbnail: string;
  camera: string;
}

export default function MapClient({ markers, center }: { markers: MapMarker[]; center: [number, number] }) {
  useEffect(() => {
    let map: any;
    import("leaflet").then(({ default: L }) => {
      const mapContainer = document.getElementById("leaflet-map");
      if (!mapContainer || (mapContainer as any)._leaflet_id) return;

      map = L.map("leaflet-map").setView(center, markers.length === 1 ? 12 : 5);
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
        const icon = L.divIcon({
          className: "custom-marker",
          html:
            count > 1
              ? `<div style="width:22px;height:22px;background:#163828;color:#fff;border-radius:50%;border:2px solid #f8faf8;box-shadow:0 2px 4px rgba(0,0,0,0.25);cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;">${count}</div>`
              : `<div style="width:12px;height:12px;background:#163828;border-radius:50%;border:2px solid #f8faf8;box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:pointer;"></div>`,
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
                <a href="/photo/${m.id}" style="font-size:13px;font-weight:500;color:#163828;text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.title}</a>
                ${m.camera ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#727973;margin-top:2px;">${m.camera}</div>` : ""}
              </div>
            </div>`
          )
          .join("");

        marker.bindPopup(
          `<div style="font-family:Inter,sans-serif;max-width:240px;">
            <div style="display:flex;align-items:center;gap:6px;padding:8px 0 4px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#727973;letter-spacing:0.05em;text-transform:uppercase;">
              <span style="width:6px;height:6px;border-radius:50%;background:#163828;display:inline-block;"></span>
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
    };
  }, [markers, center]);

  return <div id="leaflet-map" className="w-full h-full" />;
}
