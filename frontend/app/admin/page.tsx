"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import piexif from "piexifjs";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Slider,
  Switch,
  Tabs,
  TextField,
  TextArea,
  Toast,
  toast,
  useOverlayState,
} from "@heroui/react";
import {
  Photo,
  getPhotoImageUrl,
  getToken,
  clearToken,
  verifyAuth,
  fetchUsers,
  createUser,
  deleteUser,
  grantAdmin,
  AdminUser,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const API_BASE = "";

function adminPhotoUrl(id: number, thumb = true): string {
  const token = getToken();
  return getPhotoImageUrl(id, thumb, token ?? undefined);
}

function extractExifSegment(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  let offset = 2;
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

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <TextField className="w-full" value={value} onChange={onChange}>
      <Label className="text-label-caps text-outline">{label}</Label>
      <Input type={type} placeholder={placeholder} />
    </TextField>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  mono = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <TextField className="w-full" value={value} onChange={onChange}>
      <Label className="text-label-caps text-outline">{label}</Label>
      <TextArea rows={rows} placeholder={placeholder} className={mono ? "font-mono" : ""} />
    </TextField>
  );
}

function ParamSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const num = parseFloat(value);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-metadata-sm text-outline">{label}</Label>
        <span className="text-metadata-sm text-on-surface-variant">{value}</span>
      </div>
      <Slider
        minValue={min}
        maxValue={max}
        step={step}
        value={Number.isNaN(num) ? min : num}
        onChange={(v) => onChange(String(typeof v === "number" ? Number(v.toFixed(2)) : v))}
        className="w-full"
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </div>
  );
}

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
  const [iconUploading, setIconUploading] = useState(false);
  const iconInputRef = useRef<HTMLInputElement | null>(null);

  const [editingPhoto, setEditingPhoto] = useState<Photo | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [photoSaving, setPhotoSaving] = useState(false);
  const photoModalState = useOverlayState({
    isOpen: !!editingPhoto,
    onOpenChange: (open) => {
      if (!open) setEditingPhoto(null);
    },
  });

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
  const articleModalState = useOverlayState({
    isOpen: !!articleModal,
    onOpenChange: (open) => {
      if (!open) setArticleModal(null);
    },
  });

  const [albums, setAlbums] = useState<any[]>([]);
  const [albumModal, setAlbumModal] = useState<null | { editing: boolean; album?: any }>(null);
  const [albumForm, setAlbumForm] = useState<Record<string, string>>({
    slug: "",
    title: "",
    description: "",
    cover_photo_id: "",
  });
  const [albumSaving, setAlbumSaving] = useState(false);
  const albumModalState = useOverlayState({
    isOpen: !!albumModal,
    onOpenChange: (open) => {
      if (!open) setAlbumModal(null);
    },
  });

  const [activeTab, setActiveTab] = useState<"settings" | "upload" | "photos" | "blog" | "albums" | "analytics" | "services" | "users">("settings");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [me, setMe] = useState<AdminUser | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState("");

  const [analytics, setAnalytics] = useState<any>(null);

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

  const [sortBy, setSortBy] = useState<"shoot" | "upload">("shoot");

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
    { id: "users" as const, label: "管理员", icon: "group" },
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
      loadUsers();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadUsers = async () => {
    try {
      const token = getToken();
      const [meRes, usersList] = await Promise.all([
        fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } }),
        fetchUsers(),
      ]);
      if (meRes.ok) setMe(await meRes.json());
      setUsers(usersList);
    } catch {
      // ignore
    }
  };

  const handleCreateUser = async () => {
    if (userSaving) return;
    if (!newUsername.trim() || newPassword.length < 6) {
      setUserError("请输入用户名，密码至少 6 位");
      return;
    }
    setUserSaving(true);
    setUserError("");
    try {
      await createUser(newUsername.trim(), newPassword);
      setNewUsername("");
      setNewPassword("");
      await loadUsers();
      toast.success("管理员已创建");
    } catch (err: any) {
      setUserError(err?.message?.replace(/^.*"detail":"([^"]+)".*$/, "$1") || "创建失败");
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteUser(id);
      await loadUsers();
      toast.success("账号已删除");
    } catch (err: any) {
      setUserError(err?.message?.replace(/^.*"detail":"([^"]+)".*$/, "$1") || "删除失败");
    }
  };

  const handleGrantAdmin = async (id: number) => {
    try {
      await grantAdmin(id);
      await loadUsers();
      toast.success("已授权管理员权限");
    } catch (err: any) {
      setUserError(err?.message?.replace(/^.*"detail":"([^"]+)".*$/, "$1") || "授权失败");
    }
  };

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
        toast.success("图标已上传");
      }
    } catch {
      toast.danger("图标上传失败");
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
      toast.success("设置已保存");
    } catch {
      toast.danger("保存失败");
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
      toast.success("照片已更新");
    } catch {
      toast.danger("更新失败");
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selectedFiles]);
    selectedFiles.forEach((file) => {
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

      if (file.size <= targetBytes) {
        resolve({ file, exifBase64: "", exifJson: "" });
        return;
      }

      const mime = file.type || "";
      const isDecodable = mime.startsWith("image/jpeg") || mime.startsWith("image/png") || mime.startsWith("image/webp");
      if (!isDecodable) {
        resolve({ file, exifBase64: "", exifJson: "" });
        return;
      }

      let exifBase64 = "";
      let exifJson = "";
      try {
        if (mime.startsWith("image/jpeg")) {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              exifBase64 = extractExifSegment(reader.result as ArrayBuffer);
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
              exifBase64: outMime === "image/jpeg" ? exifBase64 : "",
              exifJson,
            });
          })();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve({ file, exifBase64: "", exifJson: "" });
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
      toast.warning(`已跳过 ${duplicates.length} 张重复图片`);
    } else {
      toast.success("上传完成");
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
      toast.success("照片已删除");
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
        toast.success("笔记已保存");
      }
    } catch {
      toast.danger("保存失败");
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
      toast.success("笔记已删除");
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
        toast.success("相册已保存");
      }
    } catch {
      toast.danger("保存失败");
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
      toast.success("相册已删除");
    } catch {
      // ignore
    }
  };

  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab as any);
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
      toast.success("已批量删除");
    } catch {
      toast.danger("批量删除失败");
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
      toast.success(isPublished ? "已批量发布" : "已批量隐藏");
    } catch {
      toast.danger("批量操作失败");
    } finally {
      setBatchBusy(false);
    }
  };

  const albumOptions = albums.map((a) => ({
    id: String(a.id),
    label: `${a.title}`,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Toast.Provider placement="top" />
      <Navbar />

      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-7xl mx-auto border-x border-border-subtle w-full">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-display-lg text-primary mb-2">管理后台</h1>
            <p className="text-body-md text-on-surface-variant">
              管理你的作品集内容和站点设置。
            </p>
          </div>
          <Button variant="tertiary" onPress={handleLogout}>
            登出
          </Button>
        </div>

        <Tabs
          className="w-full"
          variant="secondary"
          selectedKey={activeTab}
          onSelectionChange={(key) => handleTabSwitch(String(key))}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="后台管理">
              {TABS.map((tab) => (
                <Tabs.Tab key={tab.id} id={tab.id}>
                  <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.slice(0, 2)}</span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>

          {/* Site Settings */}
          <Tabs.Panel id="settings" className="pt-8 space-y-10">
            <section>
              <h2 className="text-headline-lg text-primary mb-2">首页 Hero 区域</h2>
              <p className="text-metadata-sm text-outline uppercase mb-6">自定义画廊首页的 Hero 区域</p>

              <Card className="p-6 gap-5">
                <div>
                  <p className="text-label-caps text-outline mb-3">图标</p>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full border border-border-subtle bg-surface flex items-center justify-center overflow-hidden">
                      {settings.hero_icon_url ? (
                        <img src={settings.hero_icon_url} alt="自定义图标" className="w-10 h-10 object-contain" />
                      ) : (
                        <span className="material-symbols-outlined text-[24px] text-primary">{settings.hero_icon}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          isDisabled={iconUploading}
                          onPress={() => iconInputRef.current?.click()}
                        >
                          {iconUploading ? "上传中..." : "上传自定义图片"}
                        </Button>
                        {settings.hero_icon_url && (
                          <Button size="sm" variant="danger" onPress={handleIconDelete}>
                            移除
                          </Button>
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

                <LabeledTextarea
                  label="标题（可用换行实现多行）"
                  value={settings.hero_title}
                  onChange={(v) => setSettings({ ...settings, hero_title: v })}
                  rows={2}
                  placeholder={"精准捕捉。\n定格永恒。"}
                />
                <LabeledTextarea
                  label="描述"
                  value={settings.hero_description}
                  onChange={(v) => setSettings({ ...settings, hero_description: v })}
                  rows={3}
                />
                <LabeledTextarea
                  label="网站标语（页脚与 SEO 描述）"
                  value={settings.site_tagline}
                  onChange={(v) => setSettings({ ...settings, site_tagline: v })}
                  rows={2}
                  placeholder="精准摄影作品集。每一帧都述说一个故事。"
                />

                <div className="border-t border-border-subtle pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-label-caps text-outline">水波纹背景（页面背景）</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        setSettings({ ...settings, water_ink1: "#171717", water_ink2: "#0a0a0a", water_ink_top: "0.15", water_strength: "1.0" })
                      }
                    >
                      重置
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {(
                      [
                        { key: "water_ink1", label: "墨水颜色 1" },
                        { key: "water_ink2", label: "墨水颜色 2" },
                      ] as const
                    ).map((field) => (
                      <div key={field.key}>
                        <p className="text-metadata-sm text-outline mb-1.5">{field.label}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={(settings as any)[field.key]}
                            onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value } as any)}
                            className="w-10 h-9 border border-border-subtle rounded-md bg-surface cursor-pointer"
                          />
                          <input
                            type="text"
                            value={(settings as any)[field.key]}
                            onChange={(e) => setSettings({ ...settings, [field.key]: e.target.value } as any)}
                            className="flex-1 border border-border-subtle p-2 text-metadata-sm bg-surface focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    ))}
                    <ParamSlider
                      label="墨水覆盖度（-0.5 ~ 0.5）"
                      min={-0.5}
                      max={0.5}
                      step={0.01}
                      value={settings.water_ink_top}
                      onChange={(v) => setSettings({ ...settings, water_ink_top: v })}
                    />
                    <ParamSlider
                      label="涟漪强度（0.2 ~ 2.0）"
                      min={0.2}
                      max={2.0}
                      step={0.05}
                      value={settings.water_strength}
                      onChange={(v) => setSettings({ ...settings, water_strength: v })}
                    />
                  </div>
                  <p className="text-metadata-sm text-outline mt-3">更改在保存后生效。重新打开或刷新页面即可预览。</p>
                </div>

                <div className="border-t border-border-subtle pt-5">
                  <p className="text-label-caps text-outline mb-3">Hero 背景（光斑着色器）</p>

                  <div className="flex flex-wrap gap-2 mb-5">
                    {BG_PRESETS.map((preset) => (
                      <Button
                        key={preset.name}
                        size="sm"
                        variant="tertiary"
                        onPress={() => setSettings({ ...settings, ...preset.colors })}
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
                      </Button>
                    ))}
                  </div>

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
                      <div key={field.key} className="flex items-center gap-2 border border-border-subtle p-2 bg-surface rounded-lg">
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

                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <ParamSlider label="渐变大小（0.2 ~ 1.5）" min={0.2} max={1.5} step={0.05} value={settings.hero_gradient_size} onChange={(v) => setSettings({ ...settings, hero_gradient_size: v })} />
                    <ParamSlider label="渐变数量（2 ~ 14）" min={2} max={14} step={1} value={settings.hero_gradient_count} onChange={(v) => setSettings({ ...settings, hero_gradient_count: v })} />
                    <ParamSlider label="速度（0.3 ~ 3.0）" min={0.3} max={3.0} step={0.1} value={settings.hero_speed} onChange={(v) => setSettings({ ...settings, hero_speed: v })} />
                    <ParamSlider label="颜色 1 权重（0.1 ~ 3.0）" min={0.1} max={3.0} step={0.1} value={settings.hero_color1_weight} onChange={(v) => setSettings({ ...settings, hero_color1_weight: v })} />
                    <ParamSlider label="颜色 2 权重（0.1 ~ 3.0）" min={0.1} max={3.0} step={0.1} value={settings.hero_color2_weight} onChange={(v) => setSettings({ ...settings, hero_color2_weight: v })} />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Button isPending={settingsSaving} onPress={handleSaveSettings} className="px-8 py-4">
                    {settingsSaving ? "保存中..." : "保存设置"}
                  </Button>
                </div>
              </Card>
            </section>
          </Tabs.Panel>

          {/* Upload */}
          <Tabs.Panel id="upload" className="pt-8">
            <h2 className="text-headline-lg text-primary mb-6">上传新照片</h2>

            <label
              className={`border border-dashed border-[var(--border)] rounded-lg p-12 flex flex-col items-center justify-center text-center bg-surface hover:bg-accent-soft/30 transition-all duration-300 cursor-pointer min-h-[250px] relative overflow-hidden ${
                uploading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <span className="material-symbols-outlined text-5xl text-[var(--muted)] mb-4">cloud_upload</span>
              <p className="text-body-md text-on-surface mb-2">将原始文件拖放至此处</p>
              <p className="text-metadata-sm text-[var(--muted)] uppercase mb-4">或点击浏览本地文件</p>
              <p className="text-metadata-sm text-[var(--muted)] text-[10px]">
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

            <Card className="mt-4 p-4 flex-col md:flex-row md:items-center gap-4">
              <Switch
                isSelected={compressEnabled}
                onChange={setCompressEnabled}
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <span className="text-body-md text-on-surface">上传时压缩图片</span>
                </Switch.Content>
              </Switch>
              <div className={`flex items-center gap-2 transition-opacity ${compressEnabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <span className="text-label-caps text-outline whitespace-nowrap">最大大小</span>
                <TextField
                  className="w-24"
                  value={String(targetSizeMb)}
                  onChange={(v) => setTargetSizeMb(parseFloat(v) || 1)}
                >
                  <Input type="number" min={0.1} max={100} step={0.1} />
                </TextField>
                <span className="text-label-caps text-outline">MB</span>
              </div>
              <p className="text-metadata-sm text-[var(--muted)] md:ml-auto">
                {compressEnabled
                  ? `在浏览器本地压缩 — 超过 ${targetSizeMb}MB 的 JPG/PNG/WebP 将重新压缩并保持尺寸不变`
                  : "文件将按原样存储"}
              </p>
            </Card>

            {files.length > 0 && (
              <div className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                  {previews.map((preview, i) => (
                    <div key={i} className="aspect-square border border-border-subtle overflow-hidden bg-surface-dim relative rounded-lg">
                      <img src={preview} alt={`预览 ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => {
                          setFiles((f) => f.filter((_, idx) => idx !== i));
                          setPreviews((p) => p.filter((_, idx) => idx !== i));
                        }}
                        className="absolute top-1 right-1 w-5 h-5 bg-[var(--danger)] text-white rounded-full flex items-center justify-center text-[12px]"
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

                <Button
                  onPress={handleUpload}
                  isDisabled={uploading}
                  isPending={uploading}
                  className="mx-auto block px-8"
                >
                  <span className="material-symbols-outlined text-[16px]">publish</span>
                  {uploading ? "上传中..." : `上传 ${files.length} 个文件`}
                </Button>
              </div>
            )}
          </Tabs.Panel>

          {/* Photos */}
          <Tabs.Panel id="photos" className="pt-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-headline-lg text-primary">照片管理</h2>
                <span className="text-metadata-sm text-outline">
                  {photos.length} 张 · {photos.filter((p) => p.is_published).length} 已发布 · {photos.filter((p) => !p.is_published).length} 草稿
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-label-caps text-outline uppercase">排序方式</span>
                <Button size="sm" variant={sortBy === "shoot" ? "primary" : "tertiary"} onPress={() => setSortBy("shoot")}>
                  拍摄日期
                </Button>
                <Button size="sm" variant={sortBy === "upload" ? "primary" : "tertiary"} onPress={() => setSortBy("upload")}>
                  上传时间
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <TextField
                className="w-full sm:max-w-sm"
                value={searchQuery}
                onChange={setSearchQuery}
              >
                <Input type="text" placeholder="按标题搜索..." />
              </TextField>
              <div className="flex items-center gap-2">
                {(["all", "published", "draft"] as const).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={statusFilter === s ? "primary" : "tertiary"}
                    onPress={() => setStatusFilter(s)}
                  >
                    {s === "all" ? "全部" : s === "published" ? "已发布" : "草稿"}
                  </Button>
                ))}
              </div>
            </div>

            <div className={`flex flex-wrap items-center gap-3 mb-4 p-3 border rounded-lg transition-all ${
              selected.size > 0 ? "border-[var(--accent)] bg-accent-soft/40" : "border-transparent"
            }`}>
              <span className="text-label-caps text-primary uppercase">
                {selected.size > 0 ? `已选择 ${selected.size} 项` : "未选择"}
              </span>
              {selected.size > 0 && (
                <>
                  <Button size="sm" variant="secondary" isDisabled={batchBusy} onPress={() => handleBatchStatus(true)}>
                    发布
                  </Button>
                  <Button size="sm" variant="tertiary" isDisabled={batchBusy} onPress={() => handleBatchStatus(false)}>
                    隐藏
                  </Button>
                  {batchConfirmDelete ? (
                    <>
                      <Button size="sm" variant="danger" isDisabled={batchBusy} onPress={handleBatchDelete}>
                        {batchBusy ? "删除中..." : "确认删除"}
                      </Button>
                      <Button size="sm" variant="ghost" onPress={() => setBatchConfirmDelete(false)}>
                        取消
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="danger" onPress={() => setBatchConfirmDelete(true)}>
                      删除所选
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onPress={() => setSelected(new Set())}>
                    清除选择
                  </Button>
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
                <div className="hidden md:flex flex-col border border-border-subtle rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 text-label-caps text-outline bg-surface-bright">
                    <div className="col-span-1">
                      <Checkbox isSelected={allVisibleSelected} onChange={toggleSelectAll}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
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
                        selected.has(photo.id) ? "bg-accent-soft/50" : "hover:bg-accent-soft/20"
                      }`}
                    >
                      <div className="col-span-1">
                        <Checkbox isSelected={selected.has(photo.id)} onChange={() => toggleSelect(photo.id)}>
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      </div>
                      <div className="col-span-2">
                        <a href={`/photo/${photo.id}`} className="w-16 h-16 bg-surface-container overflow-hidden border border-border-subtle block rounded-lg">
                          <img src={adminPhotoUrl(photo.id)} alt={photo.title} className="w-full h-full object-cover" />
                        </a>
                      </div>
                      <div className="col-span-3 text-body-md text-on-surface truncate">
                        {photo.title || "无标题"}
                      </div>
                      <div className="col-span-3 text-metadata-sm text-on-surface-variant">
                        {formatDate(photo.shoot_time) || "—"}
                        <div className="mt-1">
                          <Chip size="sm" variant="soft">
                            <Chip.Label>上传于 {formatDate(photo.created_at) || "—"}</Chip.Label>
                          </Chip>
                        </div>
                      </div>
                      <div className="col-span-1">
                        <button onClick={() => handleTogglePublish(photo)} className="rounded-none">
                          <Chip size="sm" color={photo.is_published ? "success" : "default"} variant="soft">
                            <Chip.Label>{photo.is_published ? "已发布" : "草稿"}</Chip.Label>
                          </Chip>
                        </button>
                      </div>
                      <div className="col-span-2 flex justify-end gap-2">
                        <Button isIconOnly size="sm" variant="ghost" onPress={() => startEdit(photo)} aria-label="编辑">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                        <a href={`/photo/${photo.id}`} className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors" title="查看">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </a>

                        {deleteConfirm === photo.id ? (
                          <div className="flex gap-1">
                            <Button size="sm" variant="danger" onPress={() => handleDelete(photo.id)}>
                              确认
                            </Button>
                            <Button size="sm" variant="ghost" onPress={() => setDeleteConfirm(null)}>
                              取消
                            </Button>
                          </div>
                        ) : (
                          <Button isIconOnly size="sm" variant="ghost" onPress={() => setDeleteConfirm(photo.id)} aria-label="删除">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="md:hidden flex flex-col gap-3">
                  {filteredPhotos.map((photo) => (
                    <Card key={photo.id} className="p-3 flex-row gap-3 items-center">
                      <Checkbox isSelected={selected.has(photo.id)} onChange={() => toggleSelect(photo.id)}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
                      <a
                        href={`/photo/${photo.id}`}
                        className="w-16 h-16 flex-shrink-0 bg-surface-container overflow-hidden border border-border-subtle block rounded-lg"
                      >
                        <img src={adminPhotoUrl(photo.id)} alt={photo.title} className="w-full h-full object-cover" />
                      </a>
                      <div className="flex-1 min-w-0">
                        <div className="text-body-md text-on-surface truncate font-medium">
                          {photo.title || "无标题"}
                        </div>
                        <div className="text-metadata-sm text-on-surface-variant mt-0.5">
                          {formatDate(photo.shoot_time) || "—"}
                        </div>
                        <button onClick={() => handleTogglePublish(photo)} className="mt-1.5 block">
                          <Chip size="sm" color={photo.is_published ? "success" : "default"} variant="soft">
                            <Chip.Label>{photo.is_published ? "已发布" : "草稿"}</Chip.Label>
                          </Chip>
                        </button>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <Button isIconOnly size="sm" variant="ghost" onPress={() => startEdit(photo)} aria-label="编辑">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </Button>
                        <Button isIconOnly size="sm" variant="ghost" onPress={() => setDeleteConfirm(photo.id)} aria-label="删除">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </Tabs.Panel>

          {/* Albums */}
          <Tabs.Panel id="albums" className="pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-headline-lg text-primary">相册</h2>
              <Button onPress={() => openAlbumEditor()}>
                <span className="material-symbols-outlined text-[16px]">add</span>
                新建相册
              </Button>
            </div>

            {albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border-subtle rounded-lg text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl mb-4">photo_album</span>
                <p className="text-headline-mobile text-on-surface-variant">暂无相册</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {albums.map((album) => (
                  <Card key={album.id} className="overflow-hidden gap-0">
                    <a href={`/album/${album.slug}`} className="block aspect-[4/3] bg-surface-container relative">
                      {album.cover_photo_id ? (
                        <img src={adminPhotoUrl(album.cover_photo_id)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-5xl text-outline">photo_album</span>
                        </div>
                      )}
                      <span className="absolute bottom-2 right-2">
                        <Chip size="sm">{album.photo_count}</Chip>
                      </span>
                    </a>
                    <div className="p-4 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-body-md text-on-surface truncate font-medium">{album.title}</div>
                        <div className="text-metadata-sm text-outline truncate">/album/{album.slug}</div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button isIconOnly size="sm" variant="ghost" onPress={() => openAlbumEditor(album)} aria-label="编辑">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="ghost"
                          onPress={() => {
                            if (window.confirm(`确定删除相册「${album.title}」吗？照片会保留。`)) handleDeleteAlbum(album.slug);
                          }}
                          aria-label="删除"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Tabs.Panel>

          {/* Blog */}
          <Tabs.Panel id="blog" className="pt-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <h2 className="text-headline-lg text-primary">笔记管理</h2>
              <Button onPress={() => openArticleEditor()}>
                <span className="material-symbols-outlined text-[16px]">add</span>
                新建笔记
              </Button>
            </div>

            {articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border-subtle rounded-lg text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl mb-4">article</span>
                <p className="text-headline-mobile text-on-surface-variant">暂无笔记</p>
              </div>
            ) : (
              <div className="flex flex-col border border-border-subtle rounded-lg overflow-hidden">
                <div className="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 text-label-caps text-outline bg-surface-bright">
                  <div className="col-span-4">标题</div>
                  <div className="col-span-3">别名</div>
                  <div className="col-span-2">状态</div>
                  <div className="col-span-3 flex justify-end">操作</div>
                </div>
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="grid grid-cols-12 gap-4 border-b border-border-subtle p-4 items-center hover:bg-accent-soft/20 transition-colors"
                  >
                    <div className="col-span-4 min-w-0">
                      <div className="text-body-md text-on-surface truncate font-medium">{article.title || "无标题"}</div>
                      <div className="text-metadata-sm text-outline mt-0.5">
                        {new Date(article.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {article.views} 次浏览
                      </div>
                    </div>
                    <div className="col-span-3 text-metadata-sm text-on-surface-variant truncate">
                      /blog/{article.slug}
                    </div>
                    <div className="col-span-2">
                      <button onClick={() => handleToggleArticlePublish(article)} className="rounded-none">
                        <Chip size="sm" color={article.is_published ? "success" : "default"} variant="soft">
                          <Chip.Label>{article.is_published ? "已发布" : "草稿"}</Chip.Label>
                        </Chip>
                      </button>
                    </div>
                    <div className="col-span-3 flex justify-end gap-2">
                      <Button isIconOnly size="sm" variant="ghost" onPress={() => openArticleEditor(article)} aria-label="编辑">
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </Button>
                      <a href={`/blog/${article.slug}`} className="w-8 h-8 flex items-center justify-center hover:text-primary transition-colors" title="查看">
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </a>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="ghost"
                        onPress={() => {
                          if (window.confirm(`确定删除「${article.title}」吗？`)) handleDeleteArticle(article.slug);
                        }}
                        aria-label="删除"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Tabs.Panel>

          {/* Analytics */}
          <Tabs.Panel id="analytics" className="pt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-headline-lg text-primary">访问分析</h2>
              <Button size="sm" variant="tertiary" onPress={loadAnalytics}>
                刷新
              </Button>
            </div>

            {!analytics ? (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-border-subtle rounded-lg text-on-surface-variant">
                <span className="material-symbols-outlined text-6xl mb-4">monitoring</span>
                <p className="text-metadata-sm text-outline uppercase">正在加载访问分析...</p>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "今日 PV", value: analytics.today_pv },
                    { label: "今日 UV", value: analytics.today_uv },
                    { label: "本周 PV", value: analytics.week_pv },
                    { label: "总 PV", value: analytics.total_pv },
                    { label: "总 UV", value: analytics.total_uv },
                  ].map((s) => (
                    <Card key={s.label} className="p-4">
                      <div className="text-headline-lg text-primary">{s.value}</div>
                      <div className="text-label-caps text-outline uppercase">{s.label}</div>
                    </Card>
                  ))}
                </div>

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
                          <span className="text-[9px] text-outline">{d.date.slice(5)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-label-caps text-secondary tracking-widest border-b border-primary/15 pb-2 mb-3">热门页面（7 天）</h3>
                    <div className="flex flex-col gap-2">
                      {analytics.top_pages.length === 0 && <p className="text-metadata-sm text-outline">暂无数据</p>}
                      {analytics.top_pages.map((p: any) => (
                        <div key={p.path} className="flex items-center justify-between text-metadata-sm">
                          <span className="text-on-surface truncate">{p.path}</span>
                          <span className="text-primary">{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
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
          </Tabs.Panel>

          {/* Services */}
          <Tabs.Panel id="services" className="pt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-headline-lg text-primary">服务健康检测</h2>
              <Button size="sm" variant="tertiary" isPending={servicesLoading} onPress={loadServices}>
                {servicesLoading ? "检测中..." : "重新检测"}
              </Button>
            </div>

            {!services ? (
              <p className="text-metadata-sm text-outline mb-6">
                {servicesLoading ? "正在检测所有服务..." : "点击「重新检测」运行完整健康检查。"}
              </p>
            ) : (
              fullCheckDone && (
                <Card
                  className={`mb-6 p-4 flex-row items-center gap-3 border ${
                    services.ok_count === services.total ? "border-[var(--accent)]/40 bg-accent-soft/30" : "border-[var(--danger)]/40 bg-danger-soft/30"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${services.ok_count === services.total ? "bg-[var(--accent)]" : "bg-[var(--danger)]"}`} />
                  <span className="text-body-md text-on-surface">
                    {services.ok_count} / {services.total} 项服务可用
                  </span>
                  <span className="text-metadata-sm text-outline ml-auto">检测于 {services.checked_at}</span>
                </Card>
              )
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {displayServices.map((s: any) => (
                <Card
                  key={s.name}
                  className={`p-4 gap-1.5 ${s.ok === false ? "border-[var(--danger)]/50 bg-danger-soft/20" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        s.ok === null ? "bg-[var(--muted)]" : s.ok ? "bg-[var(--accent)]" : "bg-[var(--danger)]"
                      }`}
                    />
                    <span className="text-body-md text-on-surface font-medium truncate">{s.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      isDisabled={s.checking || servicesLoading}
                      onPress={() => checkSingleService(s.name)}
                      aria-label="重新检测此服务"
                    >
                      {s.checking ? "..." : "检测"}
                    </Button>
                  </div>
                  <div className="text-metadata-sm text-outline truncate" title={s.url}>
                    {s.url}
                  </div>
                  <div className="text-metadata-sm">
                    <span className={s.ok === null ? "text-[var(--muted)]" : s.ok ? "text-primary" : "text-[var(--danger)]"}>
                      {s.ok === null ? "未检测" : s.ok ? "正常" : "故障"} · {s.latency_ms}ms
                    </span>
                  </div>
                  {s.ok === false && s.detail && (
                    <div className="text-metadata-sm text-[var(--danger)] break-all">{s.detail}</div>
                  )}
                </Card>
              ))}
            </div>
          </Tabs.Panel>

          {/* Users */}
          <Tabs.Panel id="users" className="pt-8">
            <h2 className="text-headline-lg text-primary mb-2">管理员</h2>
            <p className="text-metadata-sm text-outline uppercase mb-6">用户自行注册后，在此授权管理员权限</p>

            <Card className="p-6 gap-2">
              <h3 className="text-body-md text-on-surface font-medium">账号列表（{users.length}）</h3>
              <div className="divide-y divide-border-subtle">
                {users.map((u) => (
                  <div key={u.id} className="py-3 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[20px] text-primary flex-shrink-0">
                      {u.is_admin ? "verified_user" : "person_add"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-body-md text-on-surface truncate">{u.username}</div>
                      <div className="text-metadata-sm text-outline">ID {u.id}</div>
                    </div>
                    <Chip size="sm" color={u.is_admin ? "success" : "warning"} variant="soft">
                      <Chip.Label>{u.is_admin ? "管理员" : "待授权"}</Chip.Label>
                    </Chip>
                    {!u.is_admin && (
                      <Button size="sm" variant="secondary" onPress={() => handleGrantAdmin(u.id)}>
                        授权
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger-soft"
                      isDisabled={u.id === me?.id}
                      onPress={() => handleDeleteUser(u.id)}
                      aria-label={u.id === me?.id ? "不能删除自己" : "删除该账号"}
                    >
                      删除
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 gap-4 mt-6">
              <h3 className="text-body-md text-on-surface font-medium">添加管理员</h3>
              <p className="text-metadata-sm text-outline">
                直接创建一个管理员账号（用户也可自行注册后，由上方「授权」开通）。
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <LabeledInput label="用户名" value={newUsername} onChange={(v) => { setNewUsername(v); setUserError(""); }} placeholder="用户名" />
                <LabeledInput label="密码（至少 6 位）" value={newPassword} onChange={(v) => { setNewPassword(v); setUserError(""); }} type="password" placeholder="••••••••" />
              </div>
              {userError && (
                <p className="text-metadata-sm text-[var(--danger)]">{userError}</p>
              )}
              <Button isPending={userSaving} isDisabled={userSaving} onPress={handleCreateUser} className="self-start px-6">
                {userSaving ? "创建中..." : "创建管理员"}
              </Button>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </main>

      {/* Album Edit Modal */}
      {albumModal && (
        <Modal.Backdrop isOpen={albumModalState.isOpen} onOpenChange={albumModalState.setOpen} variant="blur">
          <Modal.Container scroll="inside">
            <Modal.Dialog className="sm:max-w-lg">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{albumModal.editing ? `编辑相册：${albumModal.album?.slug}` : "新建相册"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                <LabeledInput label="标题 *" value={albumForm.title} onChange={(v) => setAlbumForm({ ...albumForm, title: v })} placeholder="乌兰察布之旅" />
                <LabeledInput label="别名（URL）" value={albumForm.slug} onChange={(v) => setAlbumForm({ ...albumForm, slug: v })} placeholder="ulanqab-trip" />
                <LabeledTextarea label="描述" value={albumForm.description} onChange={(v) => setAlbumForm({ ...albumForm, description: v })} rows={3} />
                <Select
                  fullWidth
                  placeholder="自动（相册中最新）"
                  value={albumForm.cover_photo_id || null}
                  onChange={(v) => setAlbumForm({ ...albumForm, cover_photo_id: (v as string) || "" })}
                >
                  <Label>封面照片</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {albumModal?.album?.cover_photo_id &&
                        !photos.some((p) => p.album_id === albumModal.album.id && p.id === albumModal.album.cover_photo_id) && (
                          <ListBox.Item id={String(albumModal.album.cover_photo_id)} textValue="当前封面">
                            #{albumModal.album.cover_photo_id} — 当前封面
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        )}
                      {photos
                        .filter((p) => albumModal?.album && p.album_id === albumModal.album.id)
                        .map((p) => (
                          <ListBox.Item key={p.id} id={String(p.id)} textValue={p.title || "无标题"}>
                            #{p.id} — {p.title || p.original_filename || "无标题"}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
                <p className="text-metadata-sm text-outline">留空时，将自动使用此相册中最新的一张照片。</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setAlbumModal(null)}>
                  取消
                </Button>
                <Button isDisabled={albumSaving || !albumForm.title.trim()} isPending={albumSaving} onPress={handleSaveAlbum}>
                  {albumSaving ? "保存中..." : "保存相册"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {/* Article Edit Modal */}
      {articleModal && (
        <Modal.Backdrop isOpen={articleModalState.isOpen} onOpenChange={articleModalState.setOpen} variant="blur">
          <Modal.Container scroll="inside">
            <Modal.Dialog className="sm:max-w-3xl">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{articleModal.editing ? `编辑笔记：${articleModal.article?.slug}` : "新建笔记"}</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabeledInput label="标题 *" value={articleForm.title} onChange={(v) => setArticleForm({ ...articleForm, title: v })} placeholder="我的第一篇笔记" />
                  <LabeledInput label="别名（URL）" value={articleForm.slug} onChange={(v) => setArticleForm({ ...articleForm, slug: v })} placeholder="my-first-post" />
                </div>
                <LabeledInput
                  label="摘要"
                  value={articleForm.excerpt}
                  onChange={(v) => setArticleForm({ ...articleForm, excerpt: v })}
                  placeholder="显示在笔记列表中的简短摘要"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <LabeledInput label="标签（逗号分隔）" value={articleForm.tags} onChange={(v) => setArticleForm({ ...articleForm, tags: v })} placeholder="旅行，悉尼，黑白" />
                  <LabeledInput label="封面照片 ID（可选）" type="number" value={articleForm.cover_photo_id} onChange={(v) => setArticleForm({ ...articleForm, cover_photo_id: v })} placeholder="例如 20" />
                </div>
                <LabeledTextarea
                  label="内容（Markdown）"
                  value={articleForm.content_md}
                  onChange={(v) => setArticleForm({ ...articleForm, content_md: v })}
                  rows={14}
                  mono
                  placeholder={"# 标题\n\n使用 Markdown 撰写你的笔记...\n\n- 支持 **粗体**、图片、代码块"}
                />
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setArticleModal(null)}>
                  取消
                </Button>
                <Button isDisabled={articleSaving || !articleForm.title.trim()} isPending={articleSaving} onPress={handleSaveArticle}>
                  {articleSaving ? "保存中..." : "保存笔记"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {/* Photo Edit Modal */}
      {editingPhoto && (
        <Modal.Backdrop isOpen={photoModalState.isOpen} onOpenChange={photoModalState.setOpen} variant="blur">
          <Modal.Container scroll="inside">
            <Modal.Dialog className="sm:max-w-2xl">
              <Modal.CloseTrigger />
              <Modal.Header>
                <div className="flex items-center gap-3">
                  <img src={adminPhotoUrl(editingPhoto.id)} alt="" className="w-10 h-10 object-cover border border-border-subtle rounded-md" />
                  <Modal.Heading>编辑照片 #{editingPhoto.id}</Modal.Heading>
                </div>
              </Modal.Header>
              <Modal.Body className="space-y-4">
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
                ].map((field) =>
                  field.type === "textarea" ? (
                    <LabeledTextarea
                      key={field.key}
                      label={field.label}
                      value={editForm[field.key] || ""}
                      onChange={(v) => setEditForm({ ...editForm, [field.key]: v })}
                      rows={3}
                    />
                  ) : (
                    <LabeledInput
                      key={field.key}
                      label={field.label}
                      type={field.type}
                      value={editForm[field.key] || ""}
                      onChange={(v) => setEditForm({ ...editForm, [field.key]: v })}
                    />
                  )
                )}
                <Select
                  fullWidth
                  placeholder="不属于任何相册"
                  value={editForm.album_id || null}
                  onChange={(v) => setEditForm({ ...editForm, album_id: (v as string) || "" })}
                >
                  <Label>相册</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      {albumOptions.map((a) => (
                        <ListBox.Item key={a.id} id={a.id} textValue={a.label}>
                          {a.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onPress={() => setEditingPhoto(null)}>
                  取消
                </Button>
                <Button isPending={photoSaving} isDisabled={photoSaving} onPress={handleSavePhoto}>
                  {photoSaving ? "保存中..." : "保存更改"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      <Footer />
    </div>
  );
}
