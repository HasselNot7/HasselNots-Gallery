"use client";

import { useEffect } from "react";

interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  title: string;
  thumbnail: string;
  camera: string;
}

interface MapViewProps {
  markers: MapMarker[];
  center: [number, number];
  onMarkerClick?: (marker: MapMarker) => void;
}

export default function MapView({ markers, center, onMarkerClick }: MapViewProps) {
  useEffect(() => {
    const L = (window as any).L;
    if (!L) return;

    const mapContainer = document.getElementById("leaflet-map");
    if (!mapContainer) return;
    if ((mapContainer as any)._leaflet_id) return;

    const map = L.map("leaflet-map").setView(center, markers.length === 1 ? 12 : 5);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const bounds: [number, number][] = [];
    const markerIcon = L.divIcon({
      className: "custom-marker",
      html: `<div style="width:12px;height:12px;background:#141414;border-radius:50%;border:2px solid #f8faf8;box-shadow:0 2px 4px rgba(0,0,0,0.2);cursor:pointer;"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    markers.forEach((m) => {
      const marker = L.marker([m.latitude, m.longitude], { icon: markerIcon }).addTo(map);
      bounds.push([m.latitude, m.longitude]);

      const popupContent = `
        <div style="font-family:Inter,sans-serif;max-width:240px;">
          <div style="width:100%;height:140px;overflow:hidden;margin-bottom:8px;border:1px solid #e2e8e2;">
            <img src="${m.thumbnail}" alt="${m.title}" style="width:100%;height:100%;object-fit:cover;" />
          </div>
          <div style="font-size:14px;font-weight:500;color:#141414;margin-bottom:4px;">${m.title}</div>
          ${m.camera ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#727973;">${m.camera}</div>` : ""}
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#727973;margin-top:2px;">
            ${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}
          </div>
          <a href="/photo/${m.id}" style="display:inline-block;margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#2b2b2b;text-decoration:underline;">View Details →</a>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 260,
        className: "leaflet-popup-custom",
      });

      marker.on("click", () => {
        if (onMarkerClick) onMarkerClick(m);
      });
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      map.remove();
    };
  }, [markers, center, onMarkerClick]);

  return <div id="leaflet-map" className="w-full h-full" />;
}
