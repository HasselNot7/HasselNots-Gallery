"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import piexif from "piexifjs";
import {
  Photo,
  fetchPhotos,
  getPhotoImageUrl,
  getToken,
  clearToken,
  isAuthenticated,
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

const BG_PRESETS = [  {
    name: "Sage Green",
    colors: { bg_color1: "#316944", bg_color2: "#163828", bg_color3: "#85C093", bg_color4: "#0a0e27", bg_color5: "#98d4a6", bg_color6: "#1e4c32", bg_base: "#163828" },
  },
  {
    name: "Orange · Navy",
    colors: { bg_color1: "#F15A22", bg_color2: "#0a0e27", bg_color3: "#F15A22", bg_color4: "#0a0e27", bg_color5: "#F15A22", bg_color6: "#0a0e27", bg_base: "#0a0e27" },
  },
  {
    name: "Coral · Turquoise",
    colors: { bg_color1: "#FF6C50", bg_color2: "#40E0D0", bg_color3: "#FF6C50", bg_color4: "#40E0D0", bg_color5: "#FF6C50", bg_color6: "#40E0D0", bg_base: "#0a0e27" },
  },
  {
    name: "Orange · Navy · Turquoise",
    colors: { bg_color1: "#F15A22", bg_color2: "#0a0e27", bg_color3: "#40E0D0", bg_color4: "#F15A22", bg_color5: "#0a0e27", bg_color6: "#40E0D0", bg_base: "#0a0e27" },
  },
  {
    name: "Coral · Teal · Beige",
    colors: { bg_color1: "#F26633", bg_color2: "#2D6B6D", bg_color3: "#D1AF9C", bg_color4: "#F26633", bg_color5: "#2D6B6D", bg_color6: "#D1AF9C", bg_base: "#2D6B6D" },
  },
  {
    name: "Orange · Dark Teal",
    colors: { bg_color1: "#F15A22", bg_color2: "#004238", bg_color3: "#F15A22", bg_color4: "#000000", bg_color5: "#F15A22", bg_color6: "#000000", bg_base: "#004238" },
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
    hero_icon: "photo_camera",
    hero_icon_url: "",
    bg_color1: "#316944",
    bg_color2: "#163828",
    bg_color3: "#85C093",
    bg_color4: "#0a0e27",
    bg_color5: "#98d4a6",
    bg_color6: "#1e4c32",
    bg_base: "#163828",
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

  // Active tab
  const [activeTab, setActiveTab] = useState<"settings" | "upload" | "photos" | "blog">("settings");

  // Sort order for photo management
  const [sortBy, setSortBy] = useState<"shoot" | "upload">("shoot");

  // Batch selection + filters
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [batchConfirmDelete, setBatchConfirmDelete] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

  const TABS = [
    { id: "settings" as const, label: "Site Settings", icon: "settings" },
    { id: "upload" as const, label: "Upload Photos", icon: "cloud_upload" },
    { id: "photos" as const, label: "Photo Management", icon: "photo_library" },
    { id: "blog" as const, label: "Blog", icon: "article" },
  ];

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    loadPhotos();
    loadSettings();
    loadArticles();
  }, [router]);

  const loadArticles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/articles?published_only=false`);
      if (res.ok) setArticles(await res.json());
    } catch {
      // ignore
    }
  };

  const loadPhotos = async () => {
    try {
      const data = await fetchPhotos(false);
      setPhotos(data);
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
        setSettings({ hero_title: "", hero_description: "", hero_icon: "photo_camera", hero_icon_url: "", ...data });
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
    });
  };

  const handleSavePhoto = async () => {
    if (!editingPhoto) return;
    setPhotoSaving(true);
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(editForm)) {
      if (k === "latitude" || k === "longitude") {
        payload[k] = v ? parseFloat(v) : null;
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
        compressEnabled ? `Compressing ${i + 1}/${files.length}...` : `Uploading ${i + 1}/${files.length}...`
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
          duplicates.push(d.detail || "Duplicate");
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
      setUploadProgress(`Skipped ${duplicates.length} duplicate image${duplicates.length > 1 ? "s" : ""}: ${duplicates[0]}`);
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
            <h1 className="text-display-lg text-primary mb-2">Admin Panel</h1>
            <p className="text-body-md text-on-surface-variant">
              Manage your portfolio content and settings.
            </p>
          </div>
          <button onClick={handleLogout} className="btn-outline">
            Logout
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-subtle mb-10 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
          <h2 className="text-headline-lg text-primary mb-2">Homepage Hero</h2>
          <p className="text-metadata-sm text-outline uppercase mb-6">Customize the hero section on the gallery homepage</p>

          <div className="border border-border-subtle p-6 bg-surface-bright space-y-5">
            {/* Icon picker */}
            <div>
              <label className="text-label-caps text-outline block mb-2">Icon</label>

              {/* Custom icon upload */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full border border-border-subtle bg-surface flex items-center justify-center overflow-hidden">
                  {settings.hero_icon_url ? (
                    <img src={settings.hero_icon_url} alt="Custom icon" className="w-10 h-10 object-contain" />
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
                      {iconUploading ? "Uploading..." : "Upload Custom Image"}
                    </button>
                    {settings.hero_icon_url && (
                      <button
                        onClick={handleIconDelete}
                        className="text-label-caps px-3 py-1.5 border border-error text-error hover:bg-error hover:text-on-error transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <span className="text-metadata-sm text-outline">
                    PNG, JPG, WebP, SVG — max ~200KB recommended
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
              <label className="text-label-caps text-outline block mb-2">Title (use line breaks for multi-line)</label>
              <textarea
                value={settings.hero_title}
                onChange={(e) => setSettings({ ...settings, hero_title: e.target.value })}
                rows={2}
                className="w-full border border-border-subtle p-3 text-body-md bg-surface focus:outline-none focus:border-primary resize-none"
                placeholder="Precision Capture.\nTimeless Frames."
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-label-caps text-outline block mb-2">Description</label>
              <textarea
                value={settings.hero_description}
                onChange={(e) => setSettings({ ...settings, hero_description: e.target.value })}
                rows={3}
                className="w-full border border-border-subtle p-3 text-body-md bg-surface focus:outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Hero Background Colors */}
            <div className="border-t border-border-subtle pt-5">
              <label className="text-label-caps text-outline block mb-3">Hero Background (Light Spots Shader)</label>

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
                  { key: "bg_color1", label: "Color 1" },
                  { key: "bg_color2", label: "Color 2" },
                  { key: "bg_color3", label: "Color 3" },
                  { key: "bg_color4", label: "Color 4" },
                  { key: "bg_color5", label: "Color 5" },
                  { key: "bg_color6", label: "Color 6" },
                  { key: "bg_base", label: "Base" },
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
            </div>

            {/* Save button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="btn-primary"
              >
                {settingsSaving ? "Saving..." : "Save Settings"}
              </button>
              {settingsSaved && (
                <span className="text-metadata-sm text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Saved!
                </span>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Upload Zone */}
        {activeTab === "upload" && (
        <div className="mb-16">
          <h2 className="text-headline-lg text-primary mb-6">Upload New Capture</h2>

          <label
            className={`border border-border-subtle border-dashed p-12 flex flex-col items-center justify-center text-center bg-surface hover:bg-mint-accent/10 transition-all duration-300 cursor-pointer min-h-[250px] relative overflow-hidden group ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <span className="material-symbols-outlined text-5xl text-outline mb-4">cloud_upload</span>
            <p className="text-body-md text-on-surface mb-2">Drag and drop raw files here</p>
            <p className="text-metadata-sm text-outline uppercase mb-4">or click to browse local storage</p>
            <p className="text-metadata-sm text-outline text-[10px]">
              Supports JPG, PNG, WebP, HEIC, TIFF
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
                className="w-4 h-4 accent-[#163828]"
              />
              <label htmlFor="compress-toggle" className="text-body-md text-on-surface cursor-pointer">
                Compress images on upload
              </label>
            </div>
            <div className={`flex items-center gap-2 transition-opacity ${compressEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
              <label className="text-label-caps text-outline whitespace-nowrap">Max Size</label>
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
                ? `Compressed locally in your browser — JPG/PNG/WebP over ${targetSizeMb}MB get recompressed (dimensions kept)`
                : "Files are stored as-is"}
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                {previews.map((preview, i) => (
                  <div key={i} className="aspect-square border border-border-subtle overflow-hidden bg-surface-dim relative">
                    <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
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
                {uploading ? "Uploading..." : `Upload ${files.length} File${files.length > 1 ? "s" : ""}`}
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
              <h2 className="text-headline-lg text-primary">Photo Management</h2>
              <span className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {photos.length} TOTAL · {photos.filter((p) => p.is_published).length} PUBLISHED · {photos.filter((p) => !p.is_published).length} DRAFT
              </span>
            </div>
            {/* Sort toggle */}
            <div className="flex items-center gap-2">
              <span className="text-label-caps text-outline uppercase">Sort by</span>
              <button
                onClick={() => setSortBy("shoot")}
                className={`text-label-caps px-3 py-1.5 border transition-all ${
                  sortBy === "shoot"
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border-subtle text-on-surface-variant hover:border-primary"
                }`}
              >
                Shoot Date
              </button>
              <button
                onClick={() => setSortBy("upload")}
                className={`text-label-caps px-3 py-1.5 border transition-all ${
                  sortBy === "upload"
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border-subtle text-on-surface-variant hover:border-primary"
                }`}
              >
                Upload Time
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
                placeholder="Search by title..."
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
                  {s === "all" ? "All" : s === "published" ? "Published" : "Draft"}
                </button>
              ))}
            </div>
          </div>

          {/* Batch action toolbar */}
          <div className={`flex flex-wrap items-center gap-3 mb-4 p-3 border transition-all ${
            selected.size > 0 ? "border-primary bg-mint-accent/15" : "border-transparent"
          }`}>
            <span className="text-label-caps text-primary uppercase">
              {selected.size > 0 ? `${selected.size} Selected` : "No selection"}
            </span>
            {selected.size > 0 && (
              <>
                <button
                  onClick={() => handleBatchStatus(true)}
                  disabled={batchBusy}
                  className="text-label-caps px-3 py-1.5 border border-primary text-primary hover:bg-primary hover:text-on-primary transition-all disabled:opacity-50"
                >
                  Publish
                </button>
                <button
                  onClick={() => handleBatchStatus(false)}
                  disabled={batchBusy}
                  className="text-label-caps px-3 py-1.5 border border-border-subtle text-on-surface-variant hover:border-primary hover:text-primary transition-all disabled:opacity-50"
                >
                  Hide
                </button>
                {batchConfirmDelete ? (
                  <>
                    <button
                      onClick={handleBatchDelete}
                      disabled={batchBusy}
                      className="text-label-caps px-3 py-1.5 border border-error text-error bg-error/10 hover:bg-error hover:text-on-error transition-all disabled:opacity-50"
                    >
                      {batchBusy ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => setBatchConfirmDelete(false)}
                      className="text-label-caps px-3 py-1.5 border border-border-subtle text-on-surface-variant hover:text-primary"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setBatchConfirmDelete(true)}
                    className="text-label-caps px-3 py-1.5 border border-error text-error hover:bg-error hover:text-on-error transition-all"
                  >
                    Delete Selected
                  </button>
                )}
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-label-caps px-3 py-1.5 text-on-surface-variant hover:text-primary"
                >
                  Clear
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
                      className="w-4 h-4 accent-[#163828] cursor-pointer"
                    />
                  </div>
                  <div className="col-span-2">Preview</div>
                  <div className="col-span-3">Title</div>
                  <div className="col-span-3">Shoot Date</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-2 flex justify-end">Actions</div>
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
                        className="w-4 h-4 accent-[#163828] cursor-pointer"
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
                      {photo.title || "Untitled"}
                    </div>
                    <div className="col-span-3 text-metadata-sm text-on-surface-variant">
                      {formatDate(photo.shoot_time) || "—"}
                      <div className="mt-1">
                        <span className="inline-block text-[9px] text-primary bg-mint-accent/40 border border-mint-accent px-1.5 py-0.5 uppercase tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          Up {formatDate(photo.created_at) || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-1">
                      <button
                        onClick={() => handleTogglePublish(photo)}
                        className={`text-label-caps px-2 py-1 ${
                          photo.is_published
                            ? "bg-mint-accent/50 text-primary"
                            : "bg-surface-variant text-on-surface-variant"
                        }`}
                      >
                        {photo.is_published ? "PUB" : "DRF"}
                      </button>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                      <button
                        onClick={() => startEdit(photo)}
                        className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <a
                        href={`/photo/${photo.id}`}
                        className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                        title="View"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </a>

                      {deleteConfirm === photo.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(photo.id)}
                            className="text-label-caps text-error px-2"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-label-caps text-on-surface-variant px-2"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(photo.id)}
                          className="w-8 h-8 flex items-center justify-center hover:text-error transition-colors"
                          title="Delete"
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
                      className="w-4 h-4 accent-[#163828] cursor-pointer flex-shrink-0"
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
                        {photo.title || "Untitled"}
                      </div>
                      <div className="text-metadata-sm text-on-surface-variant mt-0.5">
                        {formatDate(photo.shoot_time) || "—"}
                      </div>
                      <span className="inline-block text-[9px] text-primary bg-mint-accent/40 border border-mint-accent px-1.5 py-0.5 uppercase tracking-wider mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        Up {formatDate(photo.created_at) || "—"}
                      </span>
                      <button
                        onClick={() => handleTogglePublish(photo)}
                        className={`text-label-caps px-2 py-0.5 mt-1.5 ${
                          photo.is_published
                            ? "bg-mint-accent/50 text-primary"
                            : "bg-surface-variant text-on-surface-variant"
                        }`}
                      >
                        {photo.is_published ? "PUBLISHED" : "DRAFT"}
                      </button>
                    </div>

                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => startEdit(photo)}
                        className="w-9 h-9 flex items-center justify-center border border-border-subtle hover:border-primary hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-[20px]">edit</span>
                      </button>
                      <a
                        href={`/photo/${photo.id}`}
                        className="w-9 h-9 flex items-center justify-center border border-border-subtle hover:border-primary hover:text-primary transition-colors"
                        title="View"
                      >
                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                      </a>
                      {deleteConfirm === photo.id ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => handleDelete(photo.id)}
                            className="text-label-caps text-error px-1 py-1 border border-error"
                          >
                            OK
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
                          title="Delete"
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
            <h2 className="text-headline-lg text-primary">Blog Management</h2>
            <button
              onClick={() => openArticleEditor()}
              className="btn-primary !py-3"
            >
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">add</span>
              New Post
            </button>
          </div>

          {articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border-subtle text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4">article</span>
              <p className="text-headline-mobile text-on-surface-variant">No posts yet</p>
            </div>
          ) : (
            <div className="flex flex-col border border-border-subtle">
              <div className="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 text-label-caps text-outline bg-surface-bright">
                <div className="col-span-4">Title</div>
                <div className="col-span-3">Slug</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3 flex justify-end">Actions</div>
              </div>
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 items-center hover:bg-mint-accent/5 transition-colors"
                >
                  <div className="col-span-4 min-w-0">
                    <div className="text-body-md text-on-surface truncate font-medium">{article.title || "Untitled"}</div>
                    <div className="text-metadata-sm text-outline mt-0.5" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {new Date(article.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {article.views} views
                    </div>
                  </div>
                  <div className="col-span-3 text-metadata-sm text-on-surface-variant truncate" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    /blog/{article.slug}
                  </div>
                  <div className="col-span-2">
                    <button
                      onClick={() => handleToggleArticlePublish(article)}
                      className={`text-label-caps px-2 py-1 ${
                        article.is_published
                          ? "bg-mint-accent/50 text-primary"
                          : "bg-surface-variant text-on-surface-variant"
                      }`}
                    >
                      {article.is_published ? "PUBLISHED" : "DRAFT"}
                    </button>
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                    <button
                      onClick={() => openArticleEditor(article)}
                      className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <a
                      href={`/blog/${article.slug}`}
                      className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors"
                      title="View"
                    >
                      <span className="material-symbols-outlined text-[18px]">visibility</span>
                    </a>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${article.title}"?`)) handleDeleteArticle(article.slug);
                      }}
                      className="w-8 h-8 flex items-center justify-center hover:text-error transition-colors"
                      title="Delete"
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
      </main>

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
                {articleModal.editing ? `Edit Post: ${articleModal.article?.slug}` : "New Post"}
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
                  <label className="text-label-caps text-outline block mb-1">Title *</label>
                  <input
                    type="text"
                    value={articleForm.title}
                    onChange={(e) => setArticleForm({ ...articleForm, title: e.target.value })}
                    className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                    placeholder="My First Post"
                  />
                </div>
                <div>
                  <label className="text-label-caps text-outline block mb-1">Slug (URL)</label>
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
                <label className="text-label-caps text-outline block mb-1">Excerpt</label>
                <input
                  type="text"
                  value={articleForm.excerpt}
                  onChange={(e) => setArticleForm({ ...articleForm, excerpt: e.target.value })}
                  className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                  placeholder="Short summary shown in the blog list"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-outline block mb-1">Tags (comma separated)</label>
                  <input
                    type="text"
                    value={articleForm.tags}
                    onChange={(e) => setArticleForm({ ...articleForm, tags: e.target.value })}
                    className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                    placeholder="travel, sydney, b&w"
                  />
                </div>
                <div>
                  <label className="text-label-caps text-outline block mb-1">Cover Photo ID (optional)</label>
                  <input
                    type="number"
                    min={1}
                    value={articleForm.cover_photo_id}
                    onChange={(e) => setArticleForm({ ...articleForm, cover_photo_id: e.target.value })}
                    className="w-full border border-border-subtle p-2 text-body-md bg-surface focus:outline-none focus:border-primary"
                    placeholder="e.g. 20"
                  />
                </div>
              </div>
              <div>
                <label className="text-label-caps text-outline block mb-1">Content (Markdown)</label>
                <textarea
                  value={articleForm.content_md}
                  onChange={(e) => setArticleForm({ ...articleForm, content_md: e.target.value })}
                  rows={14}
                  className="w-full border border-border-subtle p-3 text-body-md bg-surface focus:outline-none focus:border-primary font-mono resize-y"
                  placeholder={"# Title\n\nWrite your post in Markdown...\n\n- supports **bold**, images, code blocks"}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-border-subtle sticky bottom-0 bg-surface">
              <button
                onClick={() => setArticleModal(null)}
                className="text-label-caps px-4 py-2 border border-border-subtle text-on-surface-variant hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveArticle}
                disabled={articleSaving || !articleForm.title.trim()}
                className="btn-primary"
              >
                {articleSaving ? "Saving..." : "Save Post"}
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
                <h3 className="text-headline-lg text-primary">Edit Photo #{editingPhoto.id}</h3>
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
                { key: "title", label: "Title", type: "text" },
                { key: "description", label: "Description", type: "textarea" },
                { key: "shoot_time", label: "Shoot Time", type: "datetime-local" },
                { key: "camera_model", label: "Camera Model", type: "text" },
                { key: "lens_model", label: "Lens Model", type: "text" },
                { key: "focal_length", label: "Focal Length", type: "text" },
                { key: "aperture", label: "Aperture", type: "text" },
                { key: "shutter_speed", label: "Shutter Speed", type: "text" },
                { key: "iso", label: "ISO", type: "text" },
                { key: "latitude", label: "Latitude", type: "text" },
                { key: "longitude", label: "Longitude", type: "text" },
                { key: "location_name", label: "Location Name", type: "text" },
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
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-border-subtle sticky bottom-0 bg-surface">
              <button
                onClick={() => setEditingPhoto(null)}
                className="text-label-caps px-4 py-2 border border-border-subtle text-on-surface-variant hover:text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhoto}
                disabled={photoSaving}
                className="btn-primary"
              >
                {photoSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
