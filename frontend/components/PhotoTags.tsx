"use client";

import { Chip } from "@heroui/react";

export default function PhotoTags({
  cameraModel,
  latitude,
  longitude,
}: {
  cameraModel?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  if (!cameraModel && !(latitude && longitude)) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {cameraModel && (
        <Chip size="sm" variant="primary">
          <Chip.Label>{cameraModel}</Chip.Label>
        </Chip>
      )}
      {latitude && longitude && (
        <Chip size="sm" variant="soft">
          <Chip.Label className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Chip.Label>
        </Chip>
      )}
    </div>
  );
}
