"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import piexif from "piexifjs";
import {
  Photo,
  getPhotoImageUrl,
  getToken,
  clearToken,
  verifyAuth,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const API_BASE = "";

function extractExifSegment(arrayBuffer: ArrayBuffer): string {
  // Extract the raw EXIF APP1 segment (starting with "Exif\0\0") without parsing.
  // This preserves GPS data byte-for-byte (piexifjs re-encoding corrupts it).
  const bytes = new Uint8Array(arrayBuffer);
  let offset = 2; // skip SOI
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    const segLen = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (offset + 2 + segLen > bytes.length) break;
    if (
      marker === 0xe1 &&
      offset + 10 <= bytes.length &&
      bytes[offset + 4] === 0x45 &&
      bytes[offset + 5] === 0x78 &&
      bytes[offset + 6] === 0x69 &&
      bytes[offset + 7] === 0x66
    ) {
      const exifBytes = bytes.slice(offset + 4, offset + 2 + segLen);
      let bin = "";
      for (let i = 0; i < exifBytes.length; i++) {
        bin += String.fromCharCode(exifBytes[i]);
      }
      return btoa(bin);
    }
    offset += 2 + segLen;
  }
  return "";
}

function buildExifJson(dict: any): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const t0 = dict["0th"] || {};
  const ex = dict["Exif"] || {};
  const clean = (v: unknown) => String(v).replace(/\x00/g, "").trim();

  if (t0[271]) out.make = clean(t0[271]);
  if (t0[272]) out.model = clean(t0[272]);
  if (ex[36867] !== undefined) out.datetime_original = clean(ex[36867]);
  if (ex[36868] !== undefined) out.datetime_digitized = clean(ex[36868]);
  if (ex[33434] !== undefined) out.exposure_time = Array.isArray(ex[33434]) ? ex[33434][0] / ex[33434][1] : Number(ex[33434]);
  if (ex[33437] !== undefined) out.f_number = Array.isArray(ex[33437]) ? ex[33437][0] / ex[33437][1] : Number(ex[33437]);
  if (ex[37386] !== undefined) out.focal_length = Array.isArray(ex[37386]) ? ex[37386][0] / ex[37386][1] : Number(ex[37386]);
  if (ex[34855] !== undefined) out.iso = Number(ex[34855]);
  if (ex[42036] !== undefined) out.lens_model = clean(ex[42036]);
  // NOTE: GPS intentionally omitted here — GPS is preserved via the raw
  // EXIF segment injection (extractExifSegment) on the backend instead.
  return out;
}

const BG_PRESETS = [
  {
    name: "Monochrome · Ember",
    colors: { bg_color1: "#141414", bg_color2: "#141414", bg_color3: "#2b2b2b", bg_color4: "#262626", bg_color5: "#3a3a3a", bg_color6: "#1c1c1c", bg_base: "#141414" },
  },
  {
    name: "Charcoal · Paper",
    colors: { bg_color1: "#f5f5f5", bg_color2: "#e8e8e8", bg_color3: "#d4d4d4", bg_color4: "#ffffff", bg_color5: "#c9c9c9", bg_color6: "#efefef", bg_base: "#f2f2f2" },
  },
  {
    name: "Ink Wash",
    colors: { bg_color1: "#1a1a1a", bg_color2: "#0d0d0d", bg_color3: "#2e2e2e", bg_color4: "#4a4a4a", bg_color5: "#1f1f1f", bg_color6: "#333333", bg_base: "#111111" },
  },
  {
    name: "Graphite",
    colors: { bg_color1: "#262626", bg_color2: "#171717", bg_color3: "#3f3f3f", bg_color4: "#2b2b2b", bg_color5: "#4d4d4d", bg_color6: "#1a1a1a", bg_base: "#202020" },
  },
  {
    name: "Porcelain",
    colors: { bg_color1: "#fafafa", bg_color2: "#f0f0f0", bg_color3: "#e0e0e0", bg_color4: "#d9d9d9", bg_color5: "#ececec", bg_color6: "#f7f7f7", bg_base: "#f5f5f5" },
  },
  {
    name: "Carbon",
    colors: { bg_color1: "#0d0d0d", bg_color2: "#1f1f1f", bg_color3: "#262626", bg_color4: "#000000", bg_color5: "#2b2b2b", bg_color6: "#141414", bg_base: "#0a0a0a" },
  },
  {
    name: "Orange · Navy",
    colors: { bg_color1: "#F15A22", bg_color2: "#0a0e27", bg_color3: "#F15A22", bg_color4: "#0a0e27", bg_color5: "#F15A22", bg_color6: "#0a0e27", bg_base: "#0a0e27", hero_gradient_size: "0.45", hero_gradient_count: "12.0", hero_speed: "1.5", hero_color1_weight: "0.5", hero_color2_weight: "1.8" },
  },
  {
    name: "Coral · Turquoise",
    colors: { bg_color1: "#FF6C50", bg_color2: "#40E0D0", bg_color3: "#FF6C50", bg_color4: "#40E0D0", bg_color5: "#FF6C50", bg_color6: "#40E0D0", bg_base: "#0a0e27", hero_gradient_size: "1.0", hero_gradient_count: "6.0", hero_speed: "1.2", hero_color1_weight: "1.0", hero_color2_weight: "1.0" },
  },
  {
    name: "Orange · Navy · Turquoise",
    colors: { bg_color1: "#F15A22", bg_color2: "#0a0e27", bg_color3: "#40E0D0", bg_color4: "#F15A22", bg_color5: "#0a0e27", bg_color6: "#40E0D0", bg_base: "#0a0e27", hero_gradient_size: "0.45", hero_gradient_count: "12.0", hero_speed: "1.5", hero_color1_weight: "0.5", hero_color2_weight: "1.8" },
  },
  {
    name: "Coral · Teal · Beige",
    colors: { bg_color1: "#F26633", bg_color2: "#2D6B6D", bg_color3: "#D1AF9C", bg_color4: "#F26633", bg_color5: "#2D6B6D", bg_color6: "#D1AF9C", bg_base: "#2D6B6D", hero_gradient_size: "1.0", hero_gradient_count: "6.0", hero_speed: "1.2", hero_color1_weight: "1.0", hero_color2_weight: "1.0" },
  },
  {
    name: "Orange · Dark Teal",
    colors: { bg_color1: "#F15A22", bg_color2: "#004238", bg_color3: "#F15A22", bg_color4: "#000000", bg_color5: "#F15A22", bg_color6: "#000000", bg_base: "#004238", hero_gradient_size: "0.45", hero_gradient_count: "12.0", hero_speed: "1.5", hero_color1_weight: "0.5", hero_color2_weight: "1.8" },
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [compressEnabled, setCompressEnabled] = useState(true);
  const [targetSizeMb, setTargetSizeMb] = useState(3.0);

  // Settings state
  const [settings, setSettings] = useState({
    hero_title: "",
    hero_description: "",
    site_tagline: "",
    water_ink1: "#171717",
    water_ink2: "#0a0a0a",
    water_ink_top: "0.15",
    water_strength: "1.0",
    hero_icon: "photo_camera",
    hero_icon_url: "",
    bg_color1: "#141414",
    bg_color2: "#141414",
    bg_color3: "#f5c9c0",
    bg_color4: "#0a0e27",
    bg_color5: "#ff9c8a",
    bg_color6: "#1c1c1c",
    bg_base: "#141414",
    hero_gradient_size: "0.85",
    hero_gradient_count: "12.0",
    hero_speed: "1.1",
    hero_color1_weight: "1.0",
    hero_color2_weight: "1.3",
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  // Photo edit modal
  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [photoSaving, setPhotoSaving] = useState(false);

  // Blog management
  const [articles, setArticles] = useState<any[]>([]);
  const [articleModal, setArticleModal] = useState<null | { editing: boolean; article?: any }>(null);
  const [articleForm, setArticleForm] = useState<Record<string, string>>({
    slug: "",
    title: "",
    excerpt: "",
    tags: "",
    cover_photo_id: "",
    content_md: "",
  });
  const [articleSaving, setArticleSaving] = useState(false);

  // Albums management
  const [albums, setAlbums] = useState<any[]>([]);
  const [albumModal, setAlbumModal] = useState<null | { editing: boolean; album?: any }>(null);
  const [albumForm, setAlbumForm] = useState<Record<string, string>>({
    slug: "",
    title: "",
    description: "",
    cover_photo_id: "",
  });
  const [albumSaving, setAlbumSaving] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState<"settings" | "upload" | "photos" | "blog" | "albums" | "analytics" | "services">("settings");

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);

  // Services health
  const [services, setServices] = useState<any>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [fullCheckDone, setFullCheckDone] = useState(false);

  const SERVICE_DEFS = [
    { name: "SQLite Database", url: "本地 database.gallery.db" },
    { name: "Cloudflare R2 (S3 API)", url: "r2.cloudflarestorage.com" },
    { name: "R2 Public (r2.dev)", url: "r2.dev 公开子域" },
    { name: "Bing Map Tiles", url: "dynamic.t0.tiles.ditu.live.com" },
    { name: "Bing Satellite Tiles", url: "ecn.t0.tiles.virtualearth.net" },
    { name: "OSM Tiles", url: "https://tile.openstreetmap.org" },
    { name: "CARTO Light Tiles", url: "https://basemaps.cartocdn.com" },
    { name: "CARTO Dark Tiles", url: "https://basemaps.cartocdn.com" },
    { name: "Esri Satellite Tiles", url: "server.arcgisonline.com" },
    { name: "Esri Roads Overlay", url: "server.arcgisonline.com" },
    { name: "Esri Labels Overlay", url: "server.arcgisonline.com" },
    { name: "Gaode Street Tiles", url: "webrd01.is.autonavi.com" },
    { name: "Gaode Satellite Tiles", url: "webst01.is.autonavi.com" },
    { name: "Gaode Label Overlay", url: "webst01.is.autonavi.com" },
    { name: "Nominatim Reverse Geocode", url: "nominatim.openstreetmap.org" },
    { name: "BigDataCloud Geocode", url: "api.bigdatacloud.net" },
    { name: "Open-Meteo Geocoding", url: "geocoding-api.open-meteo.com" },
    { name: "Photon Geocoding", url: "photon.komoot.io" },
    { name: "Google Fonts CDN", url: "fonts.googleapis.com" },
    { name: "Material Symbols CDN", url: "fonts.googleapis.com" },
  ];

  const displayServices = services
    ? services.services
    : SERVICE_DEFS.map((d) => ({ ...d, ok: null, latency_ms: null, detail: "" }));

  // Sort order for photo management
  const [sortBy, setSortBy] = useState<"shoot" | "upload">("shoot");

  // Batch selection + filters
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [batchConfirmDelete, setBatchConfirmDelete] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

  const TABS = [
    { id: "settings" as const, label: "站点设置", icon: "settings" },
    { id: "upload" as const, label: "上传照片", icon: "cloud_upload" },
    { id: "photos" as const, label: "照片管理", icon: "photo_library" },
    { id: "albums" as const, label: "相册", icon: "photo_album" },
    { id: "blog" as const, label: "笔记", icon: "article" },
    { id: "analytics" as const, label: "访问分析", icon: "monitoring" },
    { id: "services" as const, label: "服务检测", icon: "monitor_heart" },
  ];

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    (async () => {
      const valid = await verifyAuth();
      if (!valid) {
        clearToken();
        router.push("/login");
        return;
      }
      loadPhotos();
      loadSettings();
      loadArticles();
      loadAlbums();
    })();
  }, [router]);

  const loadAlbums = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/albums?published_only=false`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setAlbums(await res.json());
    } catch {
      // ignore
    }
  };

  const loadArticles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/articles?published_only=false`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setArticles(await res.json());
    } catch {
      // ignore
    }
  };

  const loadAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setAnalytics(await res.json());
    } catch {
      // ignore
    }
  };

  const loadServices = async () => {
    setServicesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/services/check`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setServices(await res.json());
        setFullCheckDone(true);
      }
    } catch {
      // ignore
    } finally {
      setServicesLoading(false);
    }
  };

  const checkSingleService = async (name: string) => {
    setServices((prev: any) => {
      const base = prev
        ? prev.services
        : SERVICE_DEFS.map((d) => ({ ...d, ok: null, latency_ms: null, detail: "" }));
      const services = base.map((s: any) =>
        s.name === name ? { ...s, checking: true } : s
      );
      return prev
        ? { ...prev, services }
        : { services, ok_count: 0, total: services.length, checked_at: "" };
    });
    try {
      const res = await fetch(
        `${API_BASE}/api/services/check/${encodeURIComponent(name)}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      if (res.ok) {
        const one = await res.json();
        setServices((prev: any) => {
          if (!prev) return prev;
          const services = prev.services.map((s: any) =>
            s.name === name ? { ...one, checking: false } : s
          );
          return {
            ...prev,
            services,
            ok_count: services.filter((s: any) => s.ok).length,
          };
        });
      }
    } catch {
      // ignore
    }
  };

  const loadPhotos = async () => {
    try {
      const token = getToken();
      const all: Photo[] = [];
      let skip = 0;
      for (;;) {
        const res = await fetch(
          `${API_BASE}/api/photos?published_only=false&skip=${skip}&limit=100`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) break;
        const data = await res.json();
        all.push(...(data.items || []));
        if (all.length >= (data.total || 0)) break;
        skip += 100;
      }
      setPhotos(all);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings`);
      if (res.ok) {
        const data = await res.json();
        setSettings({ hero_title: "", hero_description: "", site_tagline: "", water_ink1: "#171717", water_ink2: "#0a0a0a", water_ink_top: "0.15", water_strength: "1.0", hero_gradient_size: "0.85", hero_gradient_count: "12.0", hero_speed: "1.1", hero_color1_weight: "1.0", hero_color2_weight: "1.3", hero_icon: "photo_camera", hero_icon_url: "", ...data });
      }
    } catch {
      // ignore
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE}/api/settings/icon`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, hero_icon_url: data.hero_icon_url });
      }
    } catch {
      // ignore
    } finally {
      setIconUploading(false);
      if (iconInputRef.current) iconInputRef.current.value = "";
    }
  };

  const handleIconDelete = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/settings/icon`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...settings, hero_icon_url: data.hero_icon_url });
      }
    } catch {
      // ignore
    }
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSettingsSaving(false);
    }
  };

  const startEdit = (photo: Photo) => {
    setEditingPhoto(photo);
    setEditForm({
      title: photo.title || "",
      description: photo.description || "",
      shoot_time: photo.shoot_time ? new Date(photo.shoot_time).toLocaleString("sv-SE").slice(0, 16) : "",
      camera_model: photo.camera_model || "",
      lens_model: photo.lens_model || "",
      focal_length: photo.focal_length || "",
      aperture: photo.aperture || "",
      shutter_speed: photo.shutter_speed || "",
      iso: photo.iso || "",
      latitude: photo.latitude?.toString() || "",
      longitude: photo.longitude?.toString() || "",
      location_name: photo.location_name || "",
      album_id: photo.album_id ? String(photo.album_id) : "",
    });
  };

  const handleSavePhoto = async () => {
    if (!editingPhoto) return;
    setPhotoSaving(true);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(editForm)) {
      if (k === "latitude" || k === "longitude") {
        payload[k] = v ? parseFloat(v) : null;
      } else if (k === "album_id") {
        payload[k] = v ? parseInt(v) : null;
      } else {
        payload[k] = v;
      }
    }
    try {
      await fetch(`${API_BASE}/api/photos/${editingPhoto.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      setEditingPhoto(null);
      await loadPhotos();
    } catch {
      // ignore
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const compressImage = (
    file: File,
    targetMb: number
  ): Promise<{ file: File; exifBase64: string; exifJson: string }> => {
    return new Promise((resolve, reject) => {
      const targetBytes = Math.max(targetMb * 1024 * 1024, 1);

      // Already small enough
      if (file.size <= targetBytes) {
        resolve({ file, exifBase64: "", exifJson: "" });
        return;
      }

      // Check type is canvas-decodable
      const mime = file.type || "";
      const isDecodable = mime.startsWith("image/jpeg") || mime.startsWith("image/png") || mime.startsWith("image/webp");
      if (!isDecodable) {
        resolve({ file, exifBase64: "", exifJson: "" }); // HEIC/TIFF etc — send as-is
        return;
      }

      // Extract EXIF from the original file before canvas destroys it
      let exifBase64 = "";
      let exifJson = "";
      try {
        if (mime.startsWith("image/jpeg")) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              // Raw byte-exact EXIF segment (preserves GPS perfectly)
              exifBase64 = extractExifSegment(reader.result as ArrayBuffer);
              // Best-effort parsed JSON for textual fields (no GPS here)
              try {
                const bytes = new Uint8Array(reader.result as ArrayBuffer);
                let bin = "";
                for (let i = 0; i < bytes.length; i++) {
                  bin += String.fromCharCode(bytes[i]);
                }
                const exifDict = piexif.load(bin);
                exifJson = JSON.stringify(buildExifJson(exifDict));
              } catch {
                exifJson = "";
              }
            } catch {
              exifBase64 = "";
              exifJson = "";
            }
            compressToBlob();
          };
          reader.onerror = () => compressToBlob();
          reader.readAsArrayBuffer(file);
        } else {
          compressToBlob();
        }
      } catch {
        compressToBlob();
      }

      function compressToBlob() {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve({ file, exifBase64: "", exifJson: "" });
            return;
          }
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(url);

          const outMime = mime.startsWith("image/png") || mime.startsWith("image/webp") ? "image/webp" : "image/jpeg";

          const tryQuality = (q: number) =>
            new Promise<Blob | null>((res) => canvas.toBlob((b) => res(b), outMime, q / 100));

          (async () => {
            let lo = 5, hi = 95;
            let best: Blob | null = null;
            while (lo <= hi) {
              const q = Math.floor((lo + hi) / 2);
              const blob = await tryQuality(q);
              if (!blob) break;
              if (blob.size <= targetBytes) {
                best = blob;
                lo = q + 1;
              } else {
                hi = q - 1;
              }
            }
            if (!best) best = await tryQuality(5);
            if (!best) {
              resolve({ file, exifBase64: "", exifJson: "" });
              return;
            }
            const ext = outMime === "image/webp" ? ".webp" : ".jpg";
            const name = file.name.replace(/\.[^/.]+$/, "") + ext;
            resolve({
              file: new File([best], name, { type: outMime }),
              // EXIF JSON is format-independent; base64 injection only for JPEG
              exifBase64: outMime === "image/jpeg" ? exifBase64 : "",
              exifJson,
            });
          })();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ file, exifBase64: "", exifJson: "" }); // decode failed — send as-is
        };
        img.src = url;
      }
    });
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const duplicates: string[] = [];

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(
        compressEnabled ? `正在压缩 ${i + 1}/${files.length}...` : `正在上传 ${i + 1}/${files.length}...`
      );
      let uploadFile = files[i];
      let exifBase64 = "";
      let exifJson = "";
      if (compressEnabled) {
        const result = await compressImage(files[i], targetSizeMb);
        uploadFile = result.file;
        exifBase64 = result.exifBase64;
        exifJson = result.exifJson;
      }
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", files[i].name.replace(/\.[^/.]+$/, ""));
      formData.append("description", "");
      formData.append("compress", String(compressEnabled));
      formData.append("target_size_mb", String(targetSizeMb));
      formData.append("exif_base64", exifBase64);
      formData.append("exif_json", exifJson);

      try {
        const res = await fetch(`${API_BASE}/api/photos/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
        if (res.status === 409) {
          const d = await res.json().catch(() => ({}));
          duplicates.push(d.detail || "重复照片");
        } else if (!res.ok) {
          console.error("Upload failed:", res.status);
        }
      } catch (err) {
        console.error("Upload failed:", err);
      }
    }

    setFiles([]);
    setPreviews([]);
    setUploadProgress("");
    setUploading(false);
    if (duplicates.length > 0) {
      setUploadProgress(`已跳过 ${duplicates.length} 张重复图片：${duplicates[0]}`);
    }
    await loadPhotos();
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_BASE}/api/photos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      setDeleteConfirm(null);
      await loadPhotos();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleTogglePublish = async (photo: Photo) => {
    try {
      await fetch(`${API_BASE}/api/photos/${photo.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_published: !photo.is_published }),
      });
      await loadPhotos();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const openArticleEditor = (article?: any) => {
    setArticleModal({ editing: !!article, article });
    setArticleForm({
      slug: article?.slug || "",
      title: article?.title || "",
      excerpt: article?.excerpt || "",
      tags: article?.tags || "",
      cover_photo_id: article?.cover_photo_id ? String(article.cover_photo_id) : "",
      content_md: article?.content_md || "",
    });
  };

  const handleSaveArticle = async () => {
    if (!articleForm.title.trim() && !articleForm.slug.trim()) return;
    setArticleSaving(true);
    const payload = {
      slug: articleForm.slug,
      title: articleForm.title,
      excerpt: articleForm.excerpt,
      tags: articleForm.tags,
      cover_photo_id: articleForm.cover_photo_id ? parseInt(articleForm.cover_photo_id) : null,
      content_md: articleForm.content_md,
      is_published: true,
    };
    try {
      const editing = articleModal?.editing;
      const slug = articleModal?.article?.slug;
      const res = await fetch(
        `${API_BASE}/api/articles${editing && slug ? `/${slug}` : ""}`,
        {
          method: editing && slug ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        setArticleModal(null);
        await loadArticles();
      }
    } catch {
      // ignore
    } finally {
      setArticleSaving(false);
    }
  };

  const handleToggleArticlePublish = async (article: any) => {
    try {
      await fetch(`${API_BASE}/api/articles/${article.slug}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_published: !article.is_published }),
      });
      await loadArticles();
    } catch {
      // ignore
    }
  };

  const handleDeleteArticle = async (slug: string) => {
    try {
      await fetch(`${API_BASE}/api/articles/${slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      await loadArticles();
    } catch {
      // ignore
    }
  };

  const openAlbumEditor = (album?: any) => {
    setAlbumModal({ editing: !!album, album });
    setAlbumForm({
      slug: album?.slug || "",
      title: album?.title || "",
      description: album?.description || "",
      cover_photo_id: album?.cover_photo_id ? String(album.cover_photo_id) : "",
    });
  };

  const handleSaveAlbum = async () => {
    if (!albumForm.title.trim()) return;
    setAlbumSaving(true);
    const payload = {
      slug: albumForm.slug,
      title: albumForm.title,
      description: albumForm.description,
      cover_photo_id: albumForm.cover_photo_id ? parseInt(albumForm.cover_photo_id) : null,
      is_published: true,
    };
    try {
      const editing = albumModal?.editing;
      const slug = albumModal?.album?.slug;
      const res = await fetch(
        `${API_BASE}/api/albums${editing && slug ? `/${slug}` : ""}`,
        {
          method: editing && slug ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      if (res.ok) {
        setAlbumModal(null);
        await loadAlbums();
      }
    } catch {
      // ignore
    } finally {
      setAlbumSaving(false);
    }
  };

  const handleDeleteAlbum = async (slug: string) => {
    try {
      await fetch(`${API_BASE}/api/albums/${slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      await loadAlbums();
    } catch {
      // ignore
    }
  };

  const handleTabSwitch = (tab: any) => {
    setActiveTab(tab);
    if (tab === "analytics") loadAnalytics();
  };

  const handleLogout = () => {
    clearToken();
    router.push("/");
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const timeOf = (d: string | null) => (d ? new Date(d).getTime() : 0);

  const sortedPhotos = [...photos].sort((a, b) => {
    const ta = sortBy === "shoot" ? timeOf(a.shoot_time) : timeOf(a.created_at);
    const tb = sortBy === "shoot" ? timeOf(b.shoot_time) : timeOf(b.created_at);
    return tb - ta;
  });

  const filteredPhotos = sortedPhotos.filter((p) => {
    if (statusFilter === "published" && !p.is_published) return false;
    if (statusFilter === "draft" && p.is_published) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const allVisibleSelected = filteredPhotos.length > 0 && filteredPhotos.every((p) => selected.has(p.id));

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredPhotos.forEach((p) => next.delete(p.id));
      } else {
        filteredPhotos.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    setBatchBusy(true);
    try {
      await fetch(`${API_BASE}/api/photos/batch-delete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: [...selected] }),
      });
      setSelected(new Set());
      setBatchConfirmDelete(false);
      await loadPhotos();
    } catch {
      // ignore
    } finally {
      setBatchBusy(false);
    }
  };

  const handleBatchStatus = async (isPublished: boolean) => {
    if (selected.size === 0) return;
    setBatchBusy(true);
    try {
      await fetch(`${API_BASE}/api/photos/batch-status`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: [...selected], is_published: isPublished }),
      });
      setSelected(new Set());
      await loadPhotos();
    } catch {
      // ignore
    } finally {
      setBatchBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-7xl mx-auto border-x border-border-subtle w-full">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-display-lg text-primary mb-2">管理后台</h1>
            <p className="text-body-md text-on-surface-variant">
              管理你的作品集内容和站点设置。
            </p>
          </div>
          <button onClick={handleLogout} className="btn-outline">
            登出
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-subtle mb-10 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-5 py-3 text-label-caps border-b-2 transition-all -mb-px whitespace-nowrap rounded-none ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-primary hover:border-primary/30"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Site Settings Section */}
        {activeTab === "settings" && (
        <div className="mb-16">
          <h2 className="text-headline-lg text-primary mb-2">首页 Hero 区域</h2>
          <p className="text-metadata-sm text-outline uppercase mb-6">自定义画廊首页的 Hero 区域</p>

          <div className="border border-border-subtle p-6 bg-surface-bright space-y-5">
            {/* Icon picker */}
            <div>
              <label className="text-label-caps text-outline block mb-2">图标</label>

              {/* Custom icon upload */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full border border-border-subtle bg-surface flex items-center justify-center overflow-hidden">
                  {settings.hero_icon_url ? (
                    <img src={settings.hero_icon_url} alt="自定义图标" className="w-10 h-10 object-contain" />
                  ) : (
                    <span className="material-symbols-outlined text-[24px] text-primary">{settings.hero_icon}</span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => iconInputRef.current?.click()}
                      disabled={iconUploading}
                      className="text-label-caps px-3 py-1.5 border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all"
                    >
                      {iconUploading ? "上传中..." : "上传自定义图片"}
                    </button>
                    {settings.hero_icon_url && (
                      <button
                        onClick={handleIconDelete}
                        className="text-label-caps px-3 py-1.5 border border-error text-error hover:bg-error hover:text-on-error transition-all"
                      >
                        移除
                      </button>
                    )}
                  </div>
                  <span className="text-metadata-sm text-outline">
                    PNG、JPG、WebP、SVG — 建议不超过约 200KB
                  </span>
                </div>
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleIconUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="text-label-caps text-outline block mb-2">标题（可用换行实现多行）</label>
              <textarea
                value={settings.hero_title}
                onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                rows={2}
                className="w-full border border-border-subtle p-3 text-body-md bg-surface focus:outline-none focus:border-primary resize-none"
                placeholder="精准捕捉。\n定格永恒。"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-label-caps text-outline block mb-2">描述</label>
              <textarea
                value={settings.hero_description}
                onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
                rows={3}
                className="w-full border border-border-subtle p-3 text-body-md bg-surface focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Site Tagline (footer & SEO) */}
            <div>
              <label className="text-label-caps text-outline block mb-2">网站标语（页脚与 SEO 描述）</label>
              <textarea
                value={settings.site_tagline}
                onChange={(e) => setSettings({ ...settings, site_tagline: e.target.value })}
                rows={2}
                className="w-full border border-border-subtle p-3 text-body-md bg-surface focus:outline-none focus:border-primary resize-none"
                placeholder="精准摄影作品集。每一帧都述说一个故事。"
              />
            </div>

            {/* Water Ripple Background */}
            <div className="border-t border-border-subtle pt-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-label-caps text-outline">水波纹背景（页面背景）</label>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, water_ink1: "#171717", water_ink2: "#0a0a0a", water_ink_top: "0.15", water_strength: "1.0" })}
                  className="text-label-caps px-3 py-1.5 bg-surface-variant text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all rounded-md"
                >
                  重置
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">墨水颜色 1</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.water_ink1}
                      onChange={(e) => setSettings({ ...settings, water_ink1: e.target.value })}
                      className="w-10 h-9 border border-border-subtle rounded-md bg-surface cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.water_ink1}
                      onChange={(e) => setSettings({ ...settings, water_ink1: e.target.value })}
                      className="flex-1 border border-border-subtle p-2 text-metadata-sm bg-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">墨水颜色 2</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settings.water_ink2}
                      onChange={(e) => setSettings({ ...settings, water_ink2: e.target.value })}
                      className="w-10 h-9 border border-border-subtle rounded-md bg-surface cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.water_ink2}
                      onChange={(e) => setSettings({ ...settings, water_ink2: e.target.value })}
                      className="flex-1 border border-border-subtle p-2 text-metadata-sm bg-surface focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">墨水覆盖度（-0.5 ~ 0.5，越大墨水越多）</label>
                  <input
                    type="range"
                    min="-0.5"
                    max="0.5"
                    step="0.01"
                    value={settings.water_ink_top}
                    onChange={(e) => setSettings({ ...settings, water_ink_top: e.target.value })}
                    className="w-full accent-primary"
                  />
                  <span className="text-metadata-sm text-on-surface-variant">{settings.water_ink_top}</span>
                </div>
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">涟漪强度（0.2 ~ 2.0）</label>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={settings.water_strength}
                    onChange={(e) => setSettings({ ...settings, water_strength: e.target.value })}
                    className="w-full accent-primary"
                  />
                  <span className="text-metadata-sm text-on-surface-variant">{settings.water_strength}</span>
                </div>
              </div>
              <p className="text-metadata-sm text-outline mt-3">更改在保存后生效。重新打开或刷新页面即可预览。</p>
            </div>

            {/* Hero Background Colors */}
            <div className="border-t border-border-subtle pt-5">
              <label className="text-label-caps text-outline block mb-3">Hero 背景（光斑着色器）</label>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-5">
                {BG_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setSettings({ ...settings, ...preset.colors })}
                    className="flex items-center gap-2 text-label-caps px-3 py-2 border border-border-subtle hover:border-primary transition-all"
                  >
                    <span className="flex -space-x-1">
                      {[preset.colors.bg_color1, preset.colors.bg_color2, preset.colors.bg_color3].map((c, i) => (
                        <span
                          key={i}
                          className="w-3.5 h-3.5 rounded-full border border-white/60"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    {preset.name}
                  </button>
                ))}
              </div>

              {/* Individual color pickers */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: "bg_color1", label: "颜色 1" },
                  { key: "bg_color2", label: "颜色 2" },
                  { key: "bg_color3", label: "颜色 3" },
                  { key: "bg_color4", label: "颜色 4" },
                  { key: "bg_color5", label: "颜色 5" },
                  { key: "bg_color6", label: "颜色 6" },
                  { key: "bg_base", label: "底色" },
                ].map((field) => (
                  <div key={field.key} className="flex items-center gap-2 border border-border-subtle p-2 bg-surface">
                    <input
                      type="color"
                      value={(settings as any)[field.key] || "#000000"}
                      onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value } as any)}
                      className="w-8 h-8 cursor-pointer border-0 bg-transparent p-0"
                    />
                    <div className="min-w-0">
                      <div className="text-label-caps text-outline">{field.label}</div>
                      <div className="text-metadata-sm text-on-surface-variant uppercase">{(settings as any)[field.key] || ""}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Animation parameters (from others/three.js动态光斑效果) */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">渐变大小（0.2 ~ 1.5）</label>
                  <input
                    type="range"
                    min="0.2"
                    max="1.5"
                    step="0.05"
                    value={settings.hero_gradient_size}
                    onChange={(e) => setSettings({ ...settings, hero_gradient_size: e.target.value })}
                    className="w-full accent-primary"
                  />
                  <span className="text-metadata-sm text-on-surface-variant">{settings.hero_gradient_size}</span>
                </div>
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">渐变数量（2 ~ 14）</label>
                  <input
                    type="range"
                    min="2"
                    max="14"
                    step="1"
                    value={settings.hero_gradient_count}
                    onChange={(e) => setSettings({ ...settings, hero_gradient_count: e.target.value })}
                    className="w-full accent-primary"
                  />
                  <span className="text-metadata-sm text-on-surface-variant">{settings.hero_gradient_count}</span>
                </div>
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">速度（0.3 ~ 3.0）</label>
                  <input
                    type="range"
                    min="0.3"
                    max="3.0"
                    step="0.1"
                    value={settings.hero_speed}
                    onChange={(e) => setSettings({ ...settings, hero_speed: e.target.value })}
                    className="w-full accent-primary"
                  />
                  <span className="text-metadata-sm text-on-surface-variant">{settings.hero_speed}</span>
                </div>
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">颜色 1 权重（0.1 ~ 3.0）</label>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={settings.hero_color1_weight}
                    onChange={(e) => setSettings({ ...settings, hero_color1_weight: e.target.value })}
                    className="w-full accent-primary"
                  />
                  <span className="text-metadata-sm text-on-surface-variant">{settings.hero_color1_weight}</span>
                </div>
                <div>
                  <label className="text-metadata-sm text-outline block mb-1.5">颜色 2 权重（0.1 ~ 3.0）</label>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={settings.hero_color2_weight}
                    onChange={(e) => setSettings({ ...settings, hero_color2_weight: e.target.value })}
                    className="w-full accent-primary"
                  />
                  <span className="text-metadata-sm text-on-surface-variant">{settings.hero_color2_weight}</span>
                </div>
              </div>
            </div>

            {/* Save button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="btn-primary"
              >
                {settingsSaving ? "保存中..." : "保存设置"}
              </button>
              {settingsSaved && (
                <span className="text-metadata-sm text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  已保存！
                </span>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Upload Zone */}
        {activeTab === "upload" && (
        <div className="mb-16">
          <h2 className="text-headline-lg text-primary mb-6">上传新照片</h2>

          <label
            className={`border border-border-subtle border-dashed p-12 flex flex-col items-center justify-center text-center bg-surface hover:bg-mint-accent/10 transition-all duration-300 cursor-pointer min-h-[250px] relative overflow-hidden group ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <span className="material-symbols-outlined text-5xl text-outline mb-4">cloud_upload</span>
            <p className="text-body-md text-on-surface mb-2">将原始文件拖放至此处</p>
            <p className="text-metadata-sm text-outline uppercase mb-4">或点击浏览本地文件</p>
            <p className="text-metadata-sm text-outline text-[10px]">
              支持 JPG、PNG、WebP、HEIC、TIFF
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
          </label>

          {/* Compression options */}
          <div className="mt-4 border border-border-subtle p-4 bg-surface-bright flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="compress-toggle"
                checked={compressEnabled}
                onChange={(e) => setCompressEnabled(e.target.checked)}
                className="w-4 h-4 accent-[#141414]"
              />
              <label htmlFor="compress-toggle" className="text-body-md text-on-surface cursor-pointer">
                上传时压缩图片
              </label>
            </div>
            <div className={`flex items-center gap-2 transition-opacity ${compressEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <label className="text-label-caps text-outline whitespace-nowrap">最大大小</label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={targetSizeMb}
                onChange={(e) => setTargetSizeMb(parseFloat(e.target.value) || 1)}
                className="w-24 border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
              />
              <span className="text-label-caps text-outline">MB</span>
            </div>
            <p className="text-metadata-sm text-outline md:ml-auto">
              {compressEnabled
                ? `在浏览器本地压缩 — 超过 ${targetSizeMb}MB 的 JPG/PNG/WebP 将重新压缩并保持尺寸不变`
                : "文件将按原样存储"}
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                {previews.map((preview, i) => (
                  <div key={i} className="aspect-square border border-border-subtle overflow-hidden bg-surface-dim relative">
                    <img src={preview} alt={`预览 ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setFiles((f) => f.filter((_, idx) => idx !== i));
                        setPreviews((p) => p.filter((_, idx) => idx !== i));
                      }}
                      className="absolute top-1 right-1 w-5 h-5 bg-error text-on-error rounded-full flex items-center justify-center text-[12px]"
                      disabled={uploading}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {uploadProgress && (
                <p className="text-metadata-sm text-primary mb-3">{uploadProgress}</p>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <span className="material-symbols-outlined text-[16px]">publish</span>
                {uploading ? "上传中..." : `上传 ${files.length} 个文件`}
              </button>
            </div>
          )}
        </div>
        )}

        {/* Photo Management Table */}
        {activeTab === "photos" && (
        <div>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-headline-lg text-primary">照片管理</h2>
              <span className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                {photos.length} 张 · {photos.filter((p) => p.is_published).length} 已发布 · {photos.filter((p) => !p.is_published).length} 草稿
              </span>
            </div>
            {/* Sort toggle */}
            <div className="flex items-center gap-2">
              <span className="text-label-caps text-outline uppercase">排序方式</span>
              <button
                onClick={() => setSortBy("shoot")}
                className={`text-label-caps px-3 py-1.5 border transition-all ${
                  sortBy === "shoot"
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border-subtle text-on-surface-variant hover:border-primary"
                }`}
              >
                拍摄日期
              </button>
              <button
                onClick={() => setSortBy("upload")}
                className={`text-label-caps px-3 py-1.5 border transition-all ${
                  sortBy === "upload"
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border-subtle text-on-surface-variant hover:border-primary"
                }`}
              >
                上传时间
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-outline">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="按标题搜索..."
                className="w-full border border-border-subtle bg-surface pl-10 pr-3 py-2 text-body-md focus:outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              {(["all", "published", "draft"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`text-label-caps px-3 py-1.5 border transition-all ${
                    statusFilter === s
                      ? "border-primary bg-primary text-on-primary"
                      : "border-border-subtle text-on-surface-variant hover:border-primary"
                  }`}
                >
                  {s === "all" ? "全部" : s === "published" ? "已发布" : "草稿"}
                </button>
              ))}
            </div>
          </div>

          {/* Batch action toolbar */}
          <div className={`flex flex-wrap items-center gap-3 mb-4 p-3 border transition-all ${
            selected.size > 0 ? "border-primary bg-mint-accent/15" : "border-transparent"
          }`}>
            <span className="text-label-caps text-primary uppercase">
              {selected.size > 0 ? `已选择 ${selected.size} 项` : "未选择"}
            </span>
            {selected.size > 0 && (
              <>
                <button
                  onClick={() => handleBatchStatus(true)}
                  disabled={batchBusy}
                  className="text-label-caps px-3 py-1.5 border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50"
                >
                  发布
                </button>
                <button
                  onClick={() => handleBatchStatus(false)}
                  disabled={batchBusy}
                  className="text-label-caps px-3 py-1.5 border border-border-subtle text-on-surface-variant hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                >
                  隐藏
                </button>
                {batchConfirmDelete ? (
                  <>
                    <button
                      onClick={handleBatchDelete}
                      disabled={batchBusy}
                      className="text-label-caps px-3 py-1.5 border border-error text-error bg-error/10 hover:bg-error hover:text-on-error transition-all disabled:opacity-50"
                    >
                      {batchBusy ? "删除中..." : "确认删除"}
                    </button>
                    <button
                      onClick={() => setBatchConfirmDelete(false)}
                      className="text-label-caps px-3 py-1.5 border border-border-subtle text-on-surface-variant hover:text-primary"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setBatchConfirmDelete(true)}
                    className="text-label-caps px-3 py-1.5 border border-error text-error hover:bg-error hover:text-on-error transition-all"
                  >
                    删除所选
                  </button>
                )}
                <button
                    onClick={() => setSelected(new Set())}
                    className="text-label-caps px-3 py-1.5 text-on-surface-variant hover:text-primary"
                  >
                    清除选择
                </button>
              </>
            )}
          </div>

          {loading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-surface-container-low border border-border-subtle" />
              ))}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:flex flex-col border border-border-subtle">
                <div className="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 text-label-caps text-outline bg-surface-bright">
                  <div className="col-span-1">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-[#141414] cursor-pointer"
                    />
                  </div>
                  <div className="col-span-2">预览</div>
                  <div className="col-span-3">标题</div>
                  <div className="col-span-3">拍摄日期</div>
                  <div className="col-span-1">状态</div>
                  <div className="col-span-2 flex justify-end">操作</div>
                </div>

                {filteredPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    className={`grid grid-cols-12 gap-4 border-b border-border-subtle p-4 items-center transition-colors ${
                      selected.has(photo.id) ? "bg-mint-accent/25" : "hover:bg-mint-accent/5"
                    }`}
                  >
                    <div className="col-span-1">
                      <input
                        type="checkbox"
                        checked={selected.has(photo.id)}
                        onChange={() => toggleSelect(photo.id)}
                        className="w-4 h-4 accent-[#141414] cursor-pointer"
                      />
                    </div>
                    <div className="col-span-2">
                      <a href={`/photo/${photo.id}`} className="w-16 h-16 bg-surface-container overflow-hidden border border-border-subtle block">
                        <img
                          src={getPhotoImageUrl(photo.id, true)}
                          alt={photo.title}
                          className="w-full h-full object-cover"
                        />
                      </a>
                    </div>
                    <div className="col-span-3 text-body-md text-on-surface truncate">
                      {photo.title || "无标题"}
                    </div>
                    <div className="col-span-3 text-metadata-sm text-on-surface-variant">
                      {formatDate(photo.shoot_time) || "—"}
                      <div className="mt-1">
                        <span className="inline-block text-[9px] text-primary bg-white border border-primary/40 px-1.5 py-0.5 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                          上传于 {formatDate(photo.created_at) || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => handleTogglePublish(photo)}
                        className={`text-label-caps px-2 py-1 bg-white text-primary border ${
                          photo.is_published ? "border-primary" : "border-primary/40"
                        }`}
                      >
                        {photo.is_published ? "已发布" : "草稿"}
                      </button>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(photo)}
                        className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                        title="编辑"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <a
                        href={`/photo/${photo.id}`}
                        className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                        title="查看"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </a>

                      {deleteConfirm === photo.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(photo.id)}
                            className="text-label-caps text-error px-2"
                          >
                            确认
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-label-caps text-on-surface-variant px-2"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(photo.id)}
                          className="w-8 h-8 flex items-center justify-center hover:text-error transition-colors"
                          title="删除"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mobile card list */}
              <div className="md:hidden flex flex-col gap-3">
                {filteredPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelect(photo.id)}
                    className={`border p-3 flex gap-3 items-center cursor-pointer transition-colors ${
                      selected.has(photo.id)
                        ? "border-primary bg-mint-accent/25"
                        : "border-border-subtle bg-surface-bright"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(photo.id)}
                      onChange={() => toggleSelect(photo.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-[#141414] cursor-pointer flex-shrink-0"
                    />
                    <a
                      href={`/photo/${photo.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 h-16 flex-shrink-0 bg-surface-container overflow-hidden border border-border-subtle block"
                    >
                      <img
                        src={getPhotoImageUrl(photo.id, true)}
                        alt={photo.title}
                        className="w-full h-full object-cover"
                      />
                    </a>

                    <div className="flex-1 min-w-0">
                      <div className="text-body-md text-on-surface truncate font-medium">
                        {photo.title || "无标题"}
                      </div>
                      <div className="text-metadata-sm text-on-surface-variant mt-0.5">
                        {formatDate(photo.shoot_time) || "—"}
                      </div>
                      <span className="inline-block text-[9px] text-primary bg-white border border-primary/40 px-1.5 py-0.5 uppercase tracking-wider mt-1" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                        上传于 {formatDate(photo.created_at) || "—"}
                      </span>
                      <button
                        onClick={() => handleTogglePublish(photo)}
                        className={`text-label-caps px-2 py-0.5 mt-1.5 bg-white text-primary border block ${
                          photo.is_published ? "border-primary" : "border-primary/40"
                        }`}
                      >
                        {photo.is_published ? "已发布" : "草稿"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(photo)}
                        className="w-9 h-9 flex items-center justify-center border border-border-subtle hover:border-primary hover:text-primary transition-colors"
                        title="编辑"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <a
                        href={`/photo/${photo.id}`}
                        className="w-9 h-9 flex items-center justify-center border border-border-subtle hover:border-primary hover:text-primary transition-colors"
                        title="查看"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </a>
                      {deleteConfirm === photo.id ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleDelete(photo.id)}
                            className="text-label-caps text-error px-1 py-1 border border-error"
                          >
                            确定
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-label-caps text-on-surface-variant px-1 py-1 border border-border-subtle"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(photo.id)}
                          className="w-9 h-9 flex items-center justify-center border border-border-subtle hover:border-error hover:text-error transition-colors"
                          title="删除"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        )}

        {/* Blog Management */}
        {activeTab === "blog" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-headline-lg text-primary">笔记管理</h2>
            <button
              onClick={() => openArticleEditor()}
              className="btn-primary !py-3"
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">add</span>
              新建笔记
            </button>
          </div>

          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border-subtle text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4">article</span>
              <p className="text-headline-mobile text-on-surface-variant">暂无笔记</p>
            </div>
          ) : (
            <div className="flex flex-col border border-border-subtle">
              <div className="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 text-label-caps text-outline bg-surface-bright">
                <div className="col-span-4">标题</div>
                <div className="col-span-3">别名</div>
                <div className="col-span-2">状态</div>
                <div className="col-span-3 flex justify-end">操作</div>
              </div>
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 items-center hover:bg-mint-accent/5 transition-colors"
                >
                  <div className="col-span-4 min-w-0">
                    <div className="text-body-md text-on-surface truncate font-medium">{article.title || "无标题"}</div>
                    <div className="text-metadata-sm text-outline mt-0.5" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                      {new Date(article.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {article.views} 次浏览
                    </div>
                  </div>
                  <div className="col-span-3 text-metadata-sm text-on-surface-variant truncate" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                    /blog/{article.slug}
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => handleToggleArticlePublish(article)}
                      className={`text-label-caps px-2 py-1 bg-white text-primary border ${
                        article.is_published ? "border-primary" : "border-primary/40"
                      }`}
                    >
                      {article.is_published ? "已发布" : "草稿"}
                    </button>
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                    <button
                      onClick={() => openArticleEditor(article)}
                      className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                      title="编辑"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <a
                      href={`/blog/${article.slug}`}
                      className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                      title="查看"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm(`确定删除「${article.title}」吗？`)) handleDeleteArticle(article.slug);
                      }}
                      className="w-8 h-8 flex items-center justify-center hover:text-error transition-colors"
                      title="删除"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
        {/* Albums Management */}
        {activeTab === "albums" && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-headline-lg text-primary">相册</h2>
            <button onClick={() => openAlbumEditor()} className="btn-primary !py-3">
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">add</span>
              新建相册
            </button>
          </div>

          {albums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border-subtle text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4">photo_album</span>
              <p className="text-headline-mobile text-on-surface-variant">暂无相册</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((album) => (
                <div key={album.id} className="border border-border-subtle bg-surface overflow-hidden">
                  <a href={`/album/${album.slug}`} className="block aspect-[4/3] bg-surface-container relative">
                    {album.cover_photo_id ? (
                      <img src={getPhotoImageUrl(album.cover_photo_id, true)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-5xl text-outline">photo_album</span>
                      </div>
                    )}
                    <span className="absolute bottom-2 right-2 text-metadata-sm text-white bg-primary/70 px-2 py-0.5" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                      {album.photo_count}
                    </span>
                  </a>
                  <div className="p-4 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-body-md text-on-surface truncate font-medium">{album.title}</div>
                      <div className="text-metadata-sm text-outline truncate" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                        /album/{album.slug}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => openAlbumEditor(album)}
                        className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                        title="编辑"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`确定删除相册「${album.title}」吗？照片会保留。`)) handleDeleteAlbum(album.slug);
                        }}
                        className="w-8 h-8 flex items-center justify-center hover:text-error transition-colors"
                        title="删除"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Analytics */}
        {activeTab === "analytics" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline-lg text-primary">访问分析</h2>
            <button onClick={loadAnalytics} className="text-label-caps px-3 py-1.5 border border-border-subtle text-on-surface-variant hover:border-primary hover:text-primary transition-all">
              刷新
            </button>
          </div>

          {!analytics ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border-subtle text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4">monitoring</span>
              <p className="text-metadata-sm text-outline uppercase">正在加载访问分析...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* 统计卡片 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "今日 PV", value: analytics.today_pv },
                  { label: "今日 UV", value: analytics.today_uv },
                  { label: "本周 PV", value: analytics.week_pv },
                  { label: "总 PV", value: analytics.total_pv },
                  { label: "总 UV", value: analytics.total_uv },
                ].map((s) => (
                  <div key={s.label} className="border border-border-subtle p-4 bg-surface-bright">
                    <div className="text-headline-lg text-primary">{s.value}</div>
                    <div className="text-label-caps text-outline uppercase">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* 7 天 PV 曲线（简单条形） */}
              <div>
                <h3 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-3">最近 7 天</h3>
                <div className="flex items-end gap-2 h-32">
                  {analytics.daily.map((d: any) => {
                    const max = Math.max(...analytics.daily.map((x: any) => x.pv), 1);
                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-metadata-sm text-on-surface-variant">{d.pv}</span>
                        <div
                          className="w-full bg-primary/70 hover:bg-primary transition-all rounded-t-md"
                          style={{ height: `${Math.max((d.pv / max) * 100, 3)}%` }}
                        />
                        <span className="text-[9px] text-outline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 热门页面 */}
                <div>
                  <h3 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-3">热门页面（7 天）</h3>
                  <div className="flex flex-col gap-2">
                    {analytics.top_pages.length === 0 && <p className="text-metadata-sm text-outline">暂无数据</p>}
                    {analytics.top_pages.map((p: any) => (
                      <div key={p.path} className="flex items-center justify-between text-metadata-sm">
                        <span className="text-on-surface truncate" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>{p.path}</span>
                        <span className="text-primary">{p.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* 热门照片 */}
                <div>
                  <h3 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-3">热门照片</h3>
                  <div className="flex flex-col gap-2">
                    {analytics.top_photos.length === 0 && <p className="text-metadata-sm text-outline">暂无数据</p>}
                    {analytics.top_photos.map((p: any) => (
                      <a key={p.id} href={`/photo/${p.id}`} className="flex items-center justify-between text-metadata-sm hover:text-primary transition-colors">
                        <span className="text-on-surface truncate">{p.title}</span>
                        <span className="text-primary ml-2">{p.views}</span>
                      </a>
                    ))}
                  </div>
                </div>
                {/* 热门文章 */}
                <div>
                  <h3 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-3">热门文章</h3>
                  <div className="flex flex-col gap-2">
                    {analytics.top_articles.length === 0 && <p className="text-metadata-sm text-outline">暂无数据</p>}
                    {analytics.top_articles.map((a: any) => (
                      <a key={a.slug} href={`/blog/${a.slug}`} className="flex items-center justify-between text-metadata-sm hover:text-primary transition-colors">
                        <span className="text-on-surface truncate">{a.title}</span>
                        <span className="text-primary ml-2">{a.views}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
        {/* Services Health */}
        {activeTab === "services" && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline-lg text-primary">服务健康检测</h2>
            <button
              onClick={loadServices}
              disabled={servicesLoading}
              className="text-label-caps px-3 py-1.5 border border-border-subtle text-on-surface-variant hover:border-primary hover:text-primary transition-all disabled:opacity-50"
            >
              {servicesLoading ? "检测中..." : "重新检测"}
            </button>
          </div>

          {!services ? (
            <p className="text-metadata-sm text-outline mb-6" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
              {servicesLoading ? "正在检测所有服务..." : "点击「重新检测」运行完整健康检查。"}
            </p>
          ) : (
            fullCheckDone && (
            <div className={`mb-6 p-4 border flex items-center gap-3 ${services.ok_count === services.total ? "border-primary/40 bg-mint-accent/10" : "border-error/40 bg-error/5"}`}>
              <span className={`w-3 h-3 rounded-full ${services.ok_count === services.total ? "bg-primary" : "bg-error"}`} />
              <span className="text-body-md text-on-surface">
                {services.ok_count} / {services.total} 项服务可用
              </span>
              <span className="text-metadata-sm text-outline ml-auto" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                检测于 {services.checked_at}
              </span>
            </div>
            )
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {displayServices.map((s: any) => (
              <div
                key={s.name}
                className={`border p-4 flex flex-col gap-1.5 ${
                  s.ok === null
                    ? "border-border-subtle bg-surface"
                    : s.ok
                      ? "border-border-subtle bg-surface-bright"
                      : "border-error/50 bg-error/5"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      s.ok === null ? "bg-outline" : s.ok ? "bg-primary" : "bg-error"
                    }`}
                  />
                  <span className="text-body-md text-on-surface font-medium truncate">{s.name}</span>
                  <button
                    onClick={() => checkSingleService(s.name)}
                    disabled={s.checking || servicesLoading}
                    className="ml-auto flex-shrink-0 text-label-caps px-2 py-1 border border-border-subtle text-on-surface-variant hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                    title="重新检测此服务"
                  >
                    {s.checking ? "..." : "检测"}
                  </button>
                </div>
                <div className="text-metadata-sm text-outline truncate" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }} title={s.url}>
                  {s.url}
                </div>
                <div className="flex items-center justify-between text-metadata-sm">
                  <span
                    className={s.ok === null ? "text-outline" : s.ok ? "text-primary" : "text-error"}
                    style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}
                  >
                    {s.ok === null ? "未检测" : s.ok ? "正常" : "故障"} · {s.latency_ms}ms
                  </span>
                </div>
                {s.ok === false && s.detail && (
                  <div className="text-metadata-sm text-error break-all" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                    {s.detail}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        )}
      </main>

      {/* Album Edit Modal */}
      {albumModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
          onClick={() => setAlbumModal(null)}
        >
          <div
            className="bg-surface max-w-lg w-full border border-primary/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border-subtle">
              <h3 className="text-headline-lg text-primary">
                {albumModal.editing ? `编辑相册：${albumModal.album?.slug}` : "新建相册"}
              </h3>
              <button
                onClick={() => setAlbumModal(null)}
                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-label-caps text-outline block mb-1">标题 *</label>
                <input
                  type="text"
                  value={albumForm.title}
                  onChange={(e) => setAlbumForm({ ...albumForm, title: e.target.value })}
                  className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                  placeholder="乌兰察布之旅"
                />
              </div>
              <div>
                <label className="text-label-caps text-outline block mb-1">别名（URL）</label>
                <input
                  type="text"
                  value={albumForm.slug}
                  onChange={(e) => setAlbumForm({ ...albumForm, slug: e.target.value })}
                  className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                  placeholder="ulanqab-trip"
                />
              </div>
              <div>
                <label className="text-label-caps text-outline block mb-1">描述</label>
                <textarea
                  value={albumForm.description}
                  onChange={(e) => setAlbumForm({ ...albumForm, description: e.target.value })}
                  rows={3}
                  className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>
              <div>
                <label className="text-label-caps text-outline block mb-1">封面照片</label>
                <select
                  value={albumForm.cover_photo_id}
                  onChange={(e) => setAlbumForm({ ...albumForm, cover_photo_id: e.target.value })}
                  className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                >
                  <option value="">自动（相册中最新）</option>
                  {albumModal?.album?.cover_photo_id &&
                    !photos.some((p) => p.album_id === albumModal.album.id && p.id === albumModal.album.cover_photo_id) && (
                      <option value={String(albumModal.album.cover_photo_id)}>
                        #{albumModal.album.cover_photo_id} — 当前封面
                      </option>
                    )}
                  {photos
                    .filter((p) => albumModal?.album && p.album_id === albumModal.album.id)
                    .map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        #{p.id} — {p.title || p.original_filename || "无标题"}
                      </option>
                    ))}
                  {photos.filter((p) => albumModal?.album && p.album_id === albumModal.album.id).length === 0 && (
                    <option value="" disabled>
                      此相册中还没有照片
                    </option>
                  )}
                </select>
                <p className="text-metadata-sm text-outline mt-1">留空时，将自动使用此相册中最新的一张照片。</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-border-subtle">
              <button
                onClick={() => setAlbumModal(null)}
                className="text-label-caps px-4 py-2 border border-border-subtle text-on-surface-variant hover:text-primary"
              >
                取消
              </button>
              <button
                onClick={handleSaveAlbum}
                disabled={albumSaving || !albumForm.title.trim()}
                className="btn-primary"
              >
                {albumSaving ? "保存中..." : "保存相册"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Article Edit Modal */}
      {articleModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
          onClick={() => setArticleModal(null)}
        >
          <div
            className="bg-surface max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-primary/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border-subtle sticky top-0 bg-surface z-10">
              <h3 className="text-headline-lg text-primary">
                {articleModal.editing ? `编辑笔记：${articleModal.article?.slug}` : "新建笔记"}
              </h3>
              <button
                onClick={() => setArticleModal(null)}
                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="text-label-caps text-outline block mb-1">标题 *</label>
                  <input
                    type="text"
                    value={articleForm.title}
                    onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                    className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                    placeholder="我的第一篇笔记"
                  />
                </div>
                <div>
                  <label className="text-label-caps text-outline block mb-1">别名（URL）</label>
                  <input
                    type="text"
                    value={articleForm.slug}
                    onChange={(e) => setArticleForm({ ...articleForm, slug: e.target.value })}
                    className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                    placeholder="my-first-post"
                  />
                </div>
              </div>
              <div>
                <label className="text-label-caps text-outline block mb-1">摘要</label>
                <input
                  type="text"
                  value={articleForm.excerpt}
                  onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                  className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                  placeholder="显示在笔记列表中的简短摘要"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-outline block mb-1">标签（逗号分隔）</label>
                  <input
                    type="text"
                    value={articleForm.tags}
                    onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })}
                    className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                    placeholder="旅行，悉尼，黑白"
                  />
                </div>
                <div>
                  <label className="text-label-caps text-outline block mb-1">封面照片 ID（可选）</label>
                  <input
                    type="number"
                    min={1}
                    value={articleForm.cover_photo_id}
                    onChange={(e) => setArticleForm({ ...articleForm, cover_photo_id: e.target.value })}
                    className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                    placeholder="例如 20"
                  />
                </div>
              </div>
              <div>
                <label className="text-label-caps text-outline block mb-1">内容（Markdown）</label>
                <textarea
                  value={articleForm.content_md}
                  onChange={(e) => setArticleForm({ ...articleForm, content_md: e.target.value })}
                  rows={14}
                  className="w-full border border-border-subtle p-3 text-body-md bg-surface focus:outline-none focus:border-primary font-mono resize-y"
                  placeholder={"# 标题\n\n使用 Markdown 撰写你的笔记...\n\n- 支持 **粗体**、图片、代码块"}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-border-subtle sticky bottom-0 bg-surface">
              <button
                onClick={() => setArticleModal(null)}
                className="text-label-caps px-4 py-2 border border-border-subtle text-on-surface-variant hover:text-primary"
              >
                取消
              </button>
              <button
                onClick={handleSaveArticle}
                disabled={articleSaving || !articleForm.title.trim()}
                className="btn-primary"
              >
                {articleSaving ? "保存中..." : "保存笔记"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Edit Modal */}
      {editingPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-primary/40 backdrop-blur-sm"
          onClick={() => setEditingPhoto(null)}
        >
          <div
            className="bg-surface max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-primary/20 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border-subtle sticky top-0 bg-surface z-10">
              <div className="flex items-center gap-3">
                <img
                  src={getPhotoImageUrl(editingPhoto.id, true)}
                  alt=""
                  className="w-10 h-10 object-cover border border-border-subtle"
                />
                <h3 className="text-headline-lg text-primary">编辑照片 #{editingPhoto.id}</h3>
              </div>
              <button
                onClick={() => setEditingPhoto(null)}
                className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-primary"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-4">
              {[
                { key: "title", label: "标题", type: "text" },
                { key: "description", label: "描述", type: "textarea" },
                { key: "shoot_time", label: "拍摄时间", type: "datetime-local" },
                { key: "camera_model", label: "相机型号", type: "text" },
                { key: "lens_model", label: "镜头型号", type: "text" },
                { key: "focal_length", label: "焦距", type: "text" },
                { key: "aperture", label: "光圈", type: "text" },
                { key: "shutter_speed", label: "快门速度", type: "text" },
                { key: "iso", label: "ISO", type: "text" },
                { key: "latitude", label: "纬度", type: "text" },
                { key: "longitude", label: "经度", type: "text" },
                { key: "location_name", label: "地点名称", type: "text" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="text-label-caps text-outline block mb-1">{field.label}</label>
                  {field.type === "textarea" ? (
                    <textarea
                      value={editForm[field.key] || ""}
                      onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                      rows={3}
                      className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary resize-none"
                    />
                  ) : (
                    <input
                      type={field.type}
                      value={editForm[field.key] || ""}
                      onChange={(e) => setEditForm({ ...editForm, [field.key]: e.target.value })}
                      className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="text-label-caps text-outline block mb-1">相册</label>
                <select
                  value={editForm.album_id || ""}
                  onChange={(e) => setEditForm({ ...editForm, album_id: e.target.value })}
                  className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                >
                  <option value="">不属于任何相册</option>
                  {albums.map((a) => (
                    <option key={a.id} value={String(a.id)}>{a.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-border-subtle sticky bottom-0 bg-surface">
              <button
                onClick={() => setEditingPhoto(null)}
                className="text-label-caps px-4 py-2 border border-border-subtle text-on-surface-variant hover:text-primary"
              >
                取消
              </button>
              <button
                onClick={handleSavePhoto}
                disabled={photoSaving}
                className="btn-primary"
              >
                {photoSaving ? "保存中..." : "保存更改"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
