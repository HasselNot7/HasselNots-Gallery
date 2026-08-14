"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { isAuthenticated, getToken } from "@/lib/api";

const LocationPicker = dynamic(() => import("@/components/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-low border border-border-subtle flex items-center justify-center">
      <span className="text-metadata-sm text-outline uppercase">Loading map...</span>
    </div>
  ),
});

const DisplayMap = dynamic(() => import("@/components/PhotoMapWrapper"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-surface-container-low border border-border-subtle flex items-center justify-center">
      <span className="text-metadata-sm text-outline uppercase">Loading map...</span>
    </div>
  ),
});

export default function PhotoLocationPanel({
  photoId,
  latitude,
  longitude,
  originalLatitude,
  originalLongitude,
  locationName,
  title,
  thumbnail,
  camera,
}: {
  photoId: number;
  latitude: number | null;
  longitude: number | null;
  originalLatitude: number | null;
  originalLongitude: number | null;
  locationName: string;
  title: string;
  thumbnail: string;
  camera: string;
}) {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [coords, setCoords] = useState<[number, number] | null>(
    latitude != null && longitude != null ? [latitude, longitude] : null
  );
  const [name, setName] = useState(locationName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  const hasLocation = coords != null;
  const hasOriginal = originalLatitude != null && originalLongitude != null;
  const isPristine =
    hasLocation &&
    hasOriginal &&
    Math.abs(coords![0] - originalLatitude!) < 1e-6 &&
    Math.abs(coords![1] - originalLongitude!) < 1e-6;

  const flash = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2500);
  };

  const save = async () => {
    if (!coords) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/photos/${photoId}/location`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ latitude: coords[0], longitude: coords[1] }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setName(d.location_name || "");
      flash("Location saved");
      setEditing(false);
      router.refresh();
    } catch {
      flash("Save failed");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/photos/${photoId}/location/reset`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setName(d.location_name || "");
      setCoords(d.latitude != null && d.longitude != null ? [d.latitude, d.longitude] : null);
      flash(
        d.latitude != null
          ? "Restored to EXIF location"
          : "Restored (no EXIF location)"
      );
      setEditing(false);
      router.refresh();
    } catch {
      flash("Reset failed");
    } finally {
      setBusy(false);
    }
  };

  const canReset = hasOriginal && !isPristine;

  return (
    <div className="mt-16">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <h2 className="text-headline-lg text-primary">Location</h2>
        <div className="flex items-center gap-3">
          {name && (
            <span className="text-label-caps text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">location_on</span>
              {name}
            </span>
          )}
          {message && <span className="text-metadata-sm text-primary">{message}</span>}
          {authed && !editing && (
            <button
              onClick={() => {
                setEditing(true);
                setCoords(
                  latitude != null && longitude != null ? [latitude, longitude] : null
                );
              }}
              className="text-label-caps px-3 py-1.5 border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all"
            >
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">edit_location_alt</span>
              {hasLocation ? "Edit Location" : "Set Location"}
            </button>
          )}
          {authed && !editing && canReset && (
            <button
              onClick={reset}
              disabled={busy}
              className="text-label-caps px-3 py-1.5 border border-border-subtle text-on-surface-variant hover:border-error hover:text-error transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px] align-middle mr-1">restart_alt</span>
              Reset to EXIF
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="border border-primary/40 overflow-hidden rounded relative h-[320px] md:h-[400px]">
          <div ref={pickerRef} className="absolute inset-0">
            <LocationPicker
              initial={coords}
              onPick={(c) => setCoords(c)}
            />
          </div>
          <div className="absolute bottom-3 left-3 flex gap-2 z-[500]">
            <button
              onClick={() => setEditing(false)}
              disabled={busy}
              className="text-label-caps px-3 py-1.5 bg-surface/95 backdrop-blur border border-border-subtle text-on-surface-variant hover:text-primary transition-all"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={busy || !coords}
              className="text-label-caps px-3 py-1.5 bg-primary text-on-primary border border-primary hover:bg-primary-container transition-all disabled:opacity-50"
            >
              {busy ? "Saving..." : "Save Location"}
            </button>
          </div>
          {!coords && (
            <div className="absolute inset-x-0 top-3 mx-auto w-max px-3 py-1.5 bg-surface/95 backdrop-blur border border-primary/20 text-label-caps text-on-surface-variant z-[500]">
              Click on the map to place the marker
            </div>
          )}
        </div>
      ) : (
        <>
          {hasLocation ? (
            <div className="border border-border-subtle overflow-hidden rounded h-[320px] md:h-[400px] relative">
              <div className="absolute inset-0">
                <DisplayMap
                  latitude={coords![0]}
                  longitude={coords![1]}
                  title={title}
                  thumbnail={thumbnail}
                  camera={camera}
                  photoId={photoId}
                />
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-border-subtle rounded h-[200px] flex flex-col items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 text-outline">location_off</span>
              <p className="text-metadata-sm text-outline uppercase">
                {authed ? "No location yet — click Set Location to place it on the map" : "No location data"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
