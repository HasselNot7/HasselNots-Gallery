"use client";

import dynamic from "next/dynamic";

const MapClient = dynamic(() => import("@/components/MapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[3/1] bg-surface-container-low border border-border-subtle flex items-center justify-center">
      <span className="text-metadata-sm text-outline uppercase">Loading map...</span>
    </div>
  ),
});

export default function PhotoMapWrapper({
  latitude, longitude, title, thumbnail, camera, photoId,
}: {
  latitude: number;
  longitude: number;
  title: string;
  thumbnail: string;
  camera: string;
  photoId: number;
}) {
  return (
    <MapClient
      markers={[{ id: photoId, latitude, longitude, title, thumbnail, camera }]}
      center={[latitude, longitude]}
    />
  );
}
