"use client";

import {
  type ComponentProps,
  type HTMLAttributes,
  type ReactElement,
  type RefCallback,
  useEffect,
  useState,
  useRef,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import piexif from "piexifjs";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Drawer,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Skeleton,
  Slider,
  Switch,
  TextField,
  TextArea,
  Toast,
  Tooltip,
  toast,
  useOverlayState,
} from "@heroui/react";
import {
  Photo,
  Album,
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
import { DEFAULT_SETTINGS, type Article, type SiteSettings } from "@/lib/api-server";
import { FALLBACK_LAYER_NAME, schemeThumb, TILE_LAYERS } from "@/lib/mapLayers";
import { DEFAULT_MAP_CONFIG, type MapConfig } from "@/lib/map-config";
import Navbar from "@/components/Navbar";

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

/** 后端把人类可读的原因塞在 error.message 的 detail 字段里，取不出来时回退到兜底文案 */
function apiErrorMessage(err: unknown, fallback: string) {
  const msg = err instanceof Error ? err.message : "";
  return msg.replace(/^.*"detail":"([^"]+)".*$/, "$1") || fallback;
}

/** piexif 运行时用数字 tag 作 IFD 的键，而 @types/piexifjs 声明的是具名键，
 *  所以入口收成 unknown、内部按实际形状收敛，不再整颗 dict 用 any。 */
type ExifGroups = Record<string, Record<number, unknown>>;

function buildExifJson(input: unknown): Record<string, unknown> {
  const dict = (input ?? {}) as ExifGroups;
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

function MapSectionHeading({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-[13px] font-medium text-on-surface">{title}</h3>
      <p className="mt-0.5 text-metadata-sm text-outline leading-relaxed">{hint}</p>
    </div>
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

type TabId =
  | "settings"
  | "upload"
  | "photos"
  | "blog"
  | "map"
  | "albums"
  | "analytics"
  | "services"
  | "users";

type NavItem = { id: TabId; label: string; icon: string };

/** OSM 两套瓦片主机，与 backend/routes/services.py 的 OSM_SOURCES 对应 */
const OSM_SOURCE_OPTIONS = [
  {
    value: "de",
    label: "德国镜像",
    host: "tile.openstreetmap.de",
    note: "FOSSGIS 镜像",
    warn: "",
  },
  {
    value: "official",
    label: "官方域名",
    host: "tile.openstreetmap.org",
    note: "OSM 官方瓦片服务",
    warn: "大陆不可用",
  },
];

/* 后台各面板从 /api 拿到的形状。此前一律用 any，渲染处只能再逐个 (x: any) 标注。 */
interface ServiceStatus {
  name: string;
  url: string;
  ok: boolean | null;
  latency_ms: number | null;
  detail: string;
  checking?: boolean;
}

interface ServicesReport {
  services: ServiceStatus[];
  ok_count: number;
  total: number;
  checked_at: string;
}

/** GET /api/secrets 的一项。后端只给状态与长度，值本身从不出现在响应里。 */
interface CredentialStatus {
  env_key: string;
  label: string;
  secret: boolean;
  required: boolean;
  visibility: "server" | "client";
  storage: "env" | "db";
  configured: boolean;
  length: number;
  source: "env_file" | "os_environ" | "db" | "unset";
  shadowed: boolean;
  used_by: string[];
  effect_if_missing: string;
  effect_if_rotated: string;
  restart_required: boolean;
  change_howto: string;
  provider_console: string;
}

interface VerifyResult {
  ok: boolean | null;
  detail: string;
}

interface AnalyticsReport {
  today_pv: number;
  today_uv: number;
  week_pv: number;
  total_pv: number;
  total_uv: number;
  daily: { date: string; pv: number }[];
  top_pages: { path: string; count: number }[];
  top_photos: { id: number; title: string; views: number }[];
  top_articles: { slug: string; title: string; views: number }[];
}

const PRIMARY_TABS: NavItem[] = [
  { id: "settings", label: "站点设置", icon: "settings" },
  { id: "upload", label: "上传照片", icon: "cloud_upload" },
  { id: "photos", label: "照片管理", icon: "photo_library" },
  { id: "albums", label: "相册", icon: "photo_album" },
  { id: "blog", label: "笔记", icon: "article" },
  { id: "map", label: "地图", icon: "map" },
];

const MORE_TABS: NavItem[] = [
  { id: "analytics", label: "访问分析", icon: "monitoring" },
  { id: "services", label: "服务检测", icon: "monitor_heart" },
  { id: "users", label: "管理员", icon: "group" },
];

const ALL_TABS: NavItem[] = [...PRIMARY_TABS, ...MORE_TABS];

/**
 * 列表列宽。标题是唯一的弹性列（flex-1 + min-w-0，否则 grid/flex 的 min-width:auto
 * 会让长标题撑破轨道、truncate 失效），其余列固定宽度不随容器拉伸。
 */
const PHOTO_COL = {
  check: "w-6 shrink-0",
  preview: "w-16 shrink-0",
  title: "flex-1 min-w-0",
  date: "w-48 shrink-0",
  status: "w-24 shrink-0",
  actions: "w-36 shrink-0 flex justify-end gap-2",
};

const BLOG_COL = {
  title: "flex-1 min-w-0",
  slug: "w-56 shrink-0",
  status: "w-24 shrink-0",
  actions: "w-28 shrink-0 flex justify-end gap-2",
};

const MORE_EXPANDED_KEY = "admin-nav-more-expanded";
const NAV_COLLAPSED_KEY = "admin-nav-collapsed";

// localStorage 是外部状态：用 useSyncExternalStore 读取，服务端快照固定为 false，
// 使 SSR 首帧与 hydration 一致，同时仍能在客户端恢复上次的偏好。
function makeNavPref(key: string) {
  const listeners = new Set<() => void>();
  return {
    read: () => window.localStorage.getItem(key) === "1",
    readServer: () => false,
    write: (next: boolean) => {
      window.localStorage.setItem(key, next ? "1" : "0");
      listeners.forEach((notify) => notify());
    },
    subscribe: (notify: () => void) => {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
  };
}

const prefMoreExpanded = makeNavPref(MORE_EXPANDED_KEY);
const prefNavCollapsed = makeNavPref(NAV_COLLAPSED_KEY);

const navRowClass = (active: boolean, indent = false, collapsed = false) =>
  [
    "relative flex h-10 w-full items-center gap-3 rounded-lg text-sm transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    collapsed ? "justify-center px-0" : indent ? "px-3 pl-11" : "px-3",
    active
      ? "bg-primary/10 text-primary font-medium"
      : "text-on-surface-variant font-normal hover:bg-primary/5 hover:text-primary",
  ].join(" ");

// 鼠标自上而下扫过整列时，0 延迟会让每行都闪一下；400ms 接近原生 title 的手感
const NAV_TOOLTIP_DELAY = 400;

/**
 * Tooltip.Trigger 通过 render 交还给触发元素的属性：与标签名无关的交互属性
 * （role / tabIndex / hover & focus 处理器 / aria-describedby）加一个合并后的 callback ref。
 */
type NavTriggerProps = HTMLAttributes<HTMLElement> & { ref?: RefCallback<HTMLElement> };

/**
 * 折叠态侧栏的悬停提示。
 *
 * 始终渲染这层包裹、只用 isDisabled 决定提示有无：若按 collapsed 条件性增删包裹层，
 * 展开/折叠切换会让按钮重挂载、键盘焦点丢失。
 *
 * 用 render 把触发属性直接给到 <button>/<Link> 本身：Tooltip.Trigger 默认渲染
 * div[role=button][tabindex=0]，既多出一个 tab 停靠点，也打断 flex/w-full 布局。
 */
function NavTip({
  label,
  disabled,
  render,
}: {
  label: string;
  disabled: boolean;
  render: (props: NavTriggerProps) => ReactElement;
}) {
  // Trigger 的泛型只会按它默认的 div 推断，而回传的 props 与宿主标签无关，这里收口一次
  const triggerRender = render as unknown as (props: ComponentProps<"div">) => ReactElement;
  return (
    <Tooltip delay={NAV_TOOLTIP_DELAY} isDisabled={disabled}>
      <Tooltip.Trigger render={triggerRender} />
      <Tooltip.Content showArrow placement="right">
        <Tooltip.Arrow />
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip>
  );
}

function NavRowContent({
  icon,
  label,
  collapsed,
}: {
  icon: string;
  label: string;
  collapsed: boolean;
}) {
  return (
    <>
      <span className="material-symbols-outlined text-[22px]">{icon}</span>
      {/* 折叠态保留可读文本给屏幕阅读器；sr-only 是绝对定位，不会占 flex gap */}
      <span className={collapsed ? "sr-only" : undefined}>{label}</span>
    </>
  );
}

function NavRow({
  icon,
  label,
  active = false,
  indent = false,
  collapsed = false,
  onSelect,
  ariaExpanded,
  ariaControls,
}: {
  icon: string;
  label: string;
  active?: boolean;
  indent?: boolean;
  collapsed?: boolean;
  onSelect: () => void;
  ariaExpanded?: boolean;
  ariaControls?: string;
}) {
  return (
    <NavTip
      label={label}
      disabled={!collapsed}
      render={(triggerProps) => (
        <button
          {...triggerProps}
          onClick={onSelect}
          aria-current={active ? "page" : undefined}
          aria-expanded={ariaExpanded}
          aria-controls={ariaControls}
          className={navRowClass(active, indent, collapsed)}
        >
          <NavRowContent icon={icon} label={label} collapsed={collapsed} />
        </button>
      )}
    />
  );
}

function NavRowLink({
  icon,
  label,
  href,
  collapsed = false,
}: {
  icon: string;
  label: string;
  href: string;
  collapsed?: boolean;
}) {
  return (
    <NavTip
      label={label}
      disabled={!collapsed}
      render={(triggerProps) => (
        <Link
          {...triggerProps}
          role="link"
          href={href}
          className={navRowClass(false, false, collapsed)}
        >
          <NavRowContent icon={icon} label={label} collapsed={collapsed} />
        </Link>
      )}
    />
  );
}

function NavList({
  activeTab,
  onSelect,
  moreExpanded,
  onToggleMore,
  groupSuffix,
  collapsed = false,
}: {
  activeTab: TabId;
  onSelect: (id: TabId) => void;
  moreExpanded: boolean;
  onToggleMore: () => void;
  groupSuffix: string;
  collapsed?: boolean;
}) {
  const groupId = `admin-nav-more-${groupSuffix}`;
  // 分组展开与否只由 moreExpanded 决定：折叠态同样可独立展开/收起，
  // 两种侧栏宽度共用同一份持久化状态。
  const showMoreItems = moreExpanded;

  return (
    <ul className="flex flex-col gap-1">
      {PRIMARY_TABS.map((tab) => (
        <li key={tab.id}>
          <NavRow
            icon={tab.icon}
            label={tab.label}
            active={tab.id === activeTab}
            collapsed={collapsed}
            onSelect={() => onSelect(tab.id)}
          />
        </li>
      ))}

      <li>
        {collapsed && (
          <div aria-hidden="true" className="my-2 mx-auto w-6 border-t border-border-subtle" />
        )}
        <NavTip
          label="更多功能"
          disabled={!collapsed}
          render={(triggerProps) => (
            <button
              {...triggerProps}
              onClick={onToggleMore}
              aria-label={collapsed ? "更多功能" : undefined}
              aria-expanded={moreExpanded}
              aria-controls={groupId}
              /* 它是开合器（aria-expanded 表达状态），不承担选中：无论折叠还是展开，
                 选中底色都只归子项，否则分组与当前项会同时亮成「两个都被选中」。 */
              className={navRowClass(false, false, collapsed)}
            >
              {/* 折叠态放不下 chevron，改用图标本身表达开/关 */}
              <span className="material-symbols-outlined text-[22px]">
                {collapsed && moreExpanded ? "expand_less" : "more_horiz"}
              </span>
              <span className={collapsed ? "sr-only" : "flex-1 text-left"}>更多功能</span>
              {!collapsed && (
                <span
                  aria-hidden="true"
                  className={`material-symbols-outlined text-[18px] motion-safe:transition-transform motion-safe:duration-200 ${
                    moreExpanded ? "rotate-[270deg]" : "rotate-[90deg]"
                  }`}
                >
                  chevron_right
                </span>
              )}
            </button>
          )}
        />

        <ul id={groupId} className="flex flex-col gap-1" hidden={!showMoreItems}>
          {MORE_TABS.map((tab) => (
            <li key={tab.id}>
              <NavRow
                icon={tab.icon}
                label={tab.label}
                indent
                collapsed={collapsed}
                active={tab.id === activeTab}
                onSelect={() => onSelect(tab.id)}
              />
            </li>
          ))}
        </ul>
      </li>
    </ul>
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

  const [settings, setSettings] = useState<SiteSettings>({ ...DEFAULT_SETTINGS });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const setToggle = (
    key: "show_hero_decorations" | "show_hero_shader" | "show_water_ripple",
    v: boolean,
  ) => setSettings((s) => ({ ...s, [key]: v ? "true" : "false" }));
  const setSettingsField = (key: keyof typeof settings, value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));
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

  const [articles, setArticles] = useState<Article[]>([]);
  const [articleModal, setArticleModal] = useState<null | { editing: boolean; article?: Article }>(null);
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

  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumModal, setAlbumModal] = useState<null | { editing: boolean; album?: Album }>(null);
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

  const [activeTab, setActiveTab] = useState<TabId>("settings");
  const navDrawerState = useOverlayState();
  const moreExpanded = useSyncExternalStore(
    prefMoreExpanded.subscribe,
    prefMoreExpanded.read,
    prefMoreExpanded.readServer
  );
  const navCollapsed = useSyncExternalStore(
    prefNavCollapsed.subscribe,
    prefNavCollapsed.read,
    prefNavCollapsed.readServer
  );
  const toggleMore = () => prefMoreExpanded.write(!moreExpanded);
  const toggleNavCollapsed = () => prefNavCollapsed.write(!navCollapsed);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [me, setMe] = useState<AdminUser | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState("");

  const [analytics, setAnalytics] = useState<AnalyticsReport | null>(null);

  const [services, setServices] = useState<ServicesReport | null>(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [fullCheckDone, setFullCheckDone] = useState(false);

  /* 「地图」面板的密钥状态芯片读这份盘点（backend/credentials.py 那张表） */
  const [creds, setCreds] = useState<CredentialStatus[] | null>(null);

  /* 「地图」面板：底图密钥 */
  const [cartoKey, setCartoKey] = useState("");
  const [cartoDirty, setCartoDirty] = useState(false);
  const [cartoSaving, setCartoSaving] = useState(false);
  const [cartoVerifying, setCartoVerifying] = useState(false);
  const [cartoVerify, setCartoVerify] = useState<VerifyResult | null>(null);

  /* 「地图」面板：站点默认底图 + OSM 瓦片源 */
  const [mapCfg, setMapCfg] = useState<MapConfig | null>(null);
  const [mapCfgSaving, setMapCfgSaving] = useState(false);

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

  const displayServices: ServiceStatus[] = services
    ? services.services
    : SERVICE_DEFS.map((d) => ({ ...d, ok: null, latency_ms: null, detail: "" }));

  const cartoCred = creds?.find((c) => c.env_key === "carto_api_key") ?? null;

  const savedLayer = mapCfg?.default_map_layer ?? "";
  const layerKnown = TILE_LAYERS.some((l) => l.name === savedLayer);

  const [sortBy, setSortBy] = useState<"shoot" | "upload">("shoot");

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [batchConfirmDelete, setBatchConfirmDelete] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

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
    } catch (err) {
      setUserError(apiErrorMessage(err, "创建失败"));
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await deleteUser(id);
      await loadUsers();
      toast.success("账号已删除");
    } catch (err) {
      setUserError(apiErrorMessage(err, "删除失败"));
    }
  };

  const handleGrantAdmin = async (id: number) => {
    try {
      await grantAdmin(id);
      await loadUsers();
      toast.success("已授权管理员权限");
    } catch (err) {
      setUserError(apiErrorMessage(err, "授权失败"));
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
    setServices((prev) => {
      const base: ServiceStatus[] = prev
        ? prev.services
        : SERVICE_DEFS.map((d) => ({ ...d, ok: null, latency_ms: null, detail: "" }));
      const services = base.map((s) =>
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
        setServices((prev) => {
          if (!prev) return prev;
          const services = prev.services.map((s) =>
            s.name === name ? { ...one, checking: false } : s
          );
          return {
            ...prev,
            services,
            ok_count: services.filter((s) => s.ok).length,
          };
        });
      }
    } catch {
      // ignore
    }
  };

  const authHeaders = () => ({ Authorization: `Bearer ${getToken()}` });

  const loadCredentials = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/secrets`, { headers: authHeaders() });
      if (res.ok) setCreds((await res.json()).credentials);
      else toast.danger(`凭据状态读取失败（HTTP ${res.status}）`);
    } catch {
      toast.danger("凭据状态读取失败");
    }
  };

  /**
   * 后台读地图配置走这条独立 fetch，不复用 lib/map-config.ts 那份：
   * 访客用的那份带模块级 + HTTP 双层缓存（max-age=60），管理员刚存完就要立刻看到回显，
   * no-store 只影响这一个请求，不动访客侧的缓存策略。
   */
  const loadMapConfig = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/map-config`, { cache: "no-store" });
      if (res.ok) setMapCfg(await res.json());
    } catch {
      toast.danger("地图配置读取失败");
    }
  };

  const saveMapSetting = async (patch: Partial<MapConfig>) => {
    setMapCfgSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setMapCfg((prev) => ({ ...(prev ?? DEFAULT_MAP_CONFIG), ...patch }));
      toast.success("已保存：新访客立即生效，已缓存过的浏览器最长 60 秒");
    } catch {
      toast.danger("保存失败");
    } finally {
      setMapCfgSaving(false);
    }
  };

  /**
   * 统一走这一个函数：任何失败都折成 {ok:false, detail}，调用方不必再 try。
   */
  const runVerify = async (envKey: string, candidate = ""): Promise<VerifyResult> => {
    try {
      const res = await fetch(
        `${API_BASE}/api/secrets/verify/${encodeURIComponent(envKey)}`,
        {
          method: "POST",
          headers: { ...authHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({ candidate }),
        }
      );
      if (!res.ok) return { ok: false, detail: `验证请求失败（HTTP ${res.status}）` };
      const data = await res.json();
      return { ok: data.ok, detail: data.detail };
    } catch {
      return { ok: false, detail: "验证请求失败" };
    }
  };

  const verifyCartoKey = async () => {
    setCartoVerifying(true);
    setCartoVerify(await runVerify("carto_api_key", cartoKey.trim()));
    setCartoVerifying(false);
  };

  const saveCartoKey = async () => {
    setCartoSaving(true);
    const value = cartoKey.trim();
    try {
      const res = await fetch(`${API_BASE}/api/settings`, {
        method: "PUT",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ carto_api_key: value }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(value ? "底图密钥已保存" : "底图密钥已清除");
      setCartoDirty(false);
      setCartoVerify(null);
      await loadCredentials();
    } catch {
      toast.danger("保存失败");
    } finally {
      setCartoSaving(false);
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
        setSettings({ ...DEFAULT_SETTINGS, ...data });
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
    return new Promise((resolve) => {
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

  const openArticleEditor = (article?: Article) => {
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

  const handleToggleArticlePublish = async (article: Article) => {
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

  const openAlbumEditor = (album?: Album) => {
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

  const handleTabSwitch = (tab: TabId) => {
    setActiveTab(tab);
    navDrawerState.close();
    if (tab === "analytics") loadAnalytics();
    // 地图面板的密钥状态芯片读 creds（backend/credentials.py 那张表），配置值读 map-config
    if (tab === "map") {
      if (!creds) loadCredentials();
      loadMapConfig();
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
      <Navbar
        leadingSlot={
          <button
            onClick={navDrawerState.open}
            aria-label="打开功能导航"
            className="lg:hidden flex items-center gap-1.5 h-9 px-2 -ml-1 mr-1 rounded-lg text-sm text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
            <span className="font-medium">{ALL_TABS.find((t) => t.id === activeTab)?.label}</span>
          </button>
        }
      />

      <div className="flex-1 flex items-start">
        {/* 桌面端通高侧栏：导航自身滚动，底部钉脚不参与滚动 */}
        <aside
          id="admin-sidebar"
          className={`hidden lg:flex lg:flex-col lg:shrink-0 lg:sticky lg:top-[72px] lg:h-[calc(100vh-72px)] bg-surface border-r border-border-subtle motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out ${
            navCollapsed ? "lg:w-[68px]" : "lg:w-60"
          }`}
        >
          <nav aria-label="后台功能" className="flex-1 min-h-0 overflow-y-auto px-2 py-4">
            <NavList
              activeTab={activeTab}
              onSelect={handleTabSwitch}
              moreExpanded={moreExpanded}
              onToggleMore={toggleMore}
              groupSuffix="sidebar"
              collapsed={navCollapsed}
            />
          </nav>
          <div className="shrink-0 border-t border-border-subtle px-2 py-3">
            <NavRow
              icon={navCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"}
              label={navCollapsed ? "展开侧栏" : "收起侧栏"}
              collapsed={navCollapsed}
              onSelect={toggleNavCollapsed}
              ariaExpanded={!navCollapsed}
              ariaControls="admin-sidebar"
            />
            <NavRow
              icon="logout"
              label="登出"
              collapsed={navCollapsed}
              onSelect={handleLogout}
            />
            <NavRowLink
              icon="arrow_back"
              label="返回首页"
              href="/"
              collapsed={navCollapsed}
            />
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="px-4 md:px-8 lg:px-10 xl:px-12 pt-6 pb-12">

          {/* Site Settings */}
          {activeTab === "settings" && (
          <div className="space-y-10">
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

                {/* 卡片铺满，但正文行长限住，避免超宽屏下一行拉到几百字符 */}
                <div className="max-w-3xl space-y-5">
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
                </div>

                <div className="border-t border-border-subtle pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-label-caps text-outline">品牌与文案</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        setSettings({
                          ...settings,
                          site_title: DEFAULT_SETTINGS.site_title,
                          site_name: DEFAULT_SETTINGS.site_name,
                          hero_side_label: DEFAULT_SETTINGS.hero_side_label,
                          hero_side_brand: DEFAULT_SETTINGS.hero_side_brand,
                          footer_title: DEFAULT_SETTINGS.footer_title,
                          footer_copyright: DEFAULT_SETTINGS.footer_copyright,
                        })
                      }
                    >
                      重置
                    </Button>
                  </div>
                  <p className="text-metadata-sm text-outline mb-3 max-w-3xl">
                    导航栏与页脚的这几处文字在显示时会被强制大写，因此输入时的大小写不影响最终呈现。
                  </p>
                  <div className="max-w-3xl space-y-5">
                    <LabeledInput
                      label="浏览器标签与搜索结果标题"
                      value={settings.site_title}
                      onChange={(v) => setSettingsField("site_title", v)}
                      placeholder={DEFAULT_SETTINGS.site_title}
                    />
                    <LabeledInput
                      label="站点名称（导航栏）"
                      value={settings.site_name}
                      onChange={(v) => setSettingsField("site_name", v)}
                      placeholder={DEFAULT_SETTINGS.site_name}
                    />
                    <LabeledInput
                      label="左侧竖栏标签"
                      value={settings.hero_side_label}
                      onChange={(v) => setSettingsField("hero_side_label", v)}
                      placeholder={DEFAULT_SETTINGS.hero_side_label}
                    />
                    <LabeledInput
                      label="左侧竖栏署名"
                      value={settings.hero_side_brand}
                      onChange={(v) => setSettingsField("hero_side_brand", v)}
                      placeholder={DEFAULT_SETTINGS.hero_side_brand}
                    />
                    <LabeledInput
                      label="页脚标题"
                      value={settings.footer_title}
                      onChange={(v) => setSettingsField("footer_title", v)}
                      placeholder={DEFAULT_SETTINGS.footer_title}
                    />
                    <LabeledInput
                      label="页脚版权行（{year} 会自动替换为当前年份）"
                      value={settings.footer_copyright}
                      onChange={(v) => setSettingsField("footer_copyright", v)}
                      placeholder={DEFAULT_SETTINGS.footer_copyright}
                    />
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-label-caps text-outline">装饰与背景</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        setSettings({
                          ...settings,
                          show_hero_decorations: DEFAULT_SETTINGS.show_hero_decorations,
                          show_hero_shader: DEFAULT_SETTINGS.show_hero_shader,
                          show_water_ripple: DEFAULT_SETTINGS.show_water_ripple,
                        })
                      }
                    >
                      重置
                    </Button>
                  </div>
                  <div className="flex flex-col gap-4 max-w-3xl">
                    {(
                      [
                        {
                          key: "show_hero_decorations",
                          label: "显示 HUD 装饰元素",
                          desc: "同时作用于首页 Hero、图库页与地图页的准星、刻度尺、测量线、坐标读数与右侧装饰竖栏。网格底纹、左侧品牌竖栏与标题本体不受此开关影响。",
                        },
                        {
                          key: "show_hero_shader",
                          label: "显示 Hero 动态背景",
                          desc: "关闭后不再加载 WebGL 着色器，省掉 three.js 的 GPU 上下文与逐帧动画循环，低端设备与移动端更省电。",
                        },
                        {
                          key: "show_water_ripple",
                          label: "显示页面水波纹背景",
                          desc: "仅在图库、相册、笔记、器材等页面生效，首页与后台本就不显示。",
                        },
                      ] as const
                    ).map((field) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <Switch
                          isSelected={settings[field.key] !== "false"}
                          onChange={(v) => setToggle(field.key, v)}
                        >
                          <Switch.Content>
                            <Switch.Control>
                              <Switch.Thumb />
                            </Switch.Control>
                            <span className="text-body-md text-on-surface">{field.label}</span>
                          </Switch.Content>
                        </Switch>
                        <p className="text-metadata-sm text-outline">{field.desc}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-metadata-sm text-outline mt-3">更改在保存后生效，刷新前台页面即可预览。</p>
                </div>

                <div className="border-t border-border-subtle pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-label-caps text-outline">水波纹背景（页面背景）</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={() =>
                        setSettings({
                          ...settings,
                          water_ink1: DEFAULT_SETTINGS.water_ink1,
                          water_ink2: DEFAULT_SETTINGS.water_ink2,
                          water_ink_top: DEFAULT_SETTINGS.water_ink_top,
                          water_strength: DEFAULT_SETTINGS.water_strength,
                          show_water_ripple: DEFAULT_SETTINGS.show_water_ripple,
                        })
                      }
                    >
                      重置
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
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
                            value={settings[field.key]}
                            onChange={(e) => setSettingsField(field.key, e.target.value)}
                            className="w-10 h-9 border border-border-subtle rounded-md bg-surface cursor-pointer"
                          />
                          <input
                            type="text"
                            value={settings[field.key]}
                            onChange={(e) => setSettingsField(field.key, e.target.value)}
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl">
                    {([
                      { key: "bg_color1", label: "颜色 1" },
                      { key: "bg_color2", label: "颜色 2" },
                      { key: "bg_color3", label: "颜色 3" },
                      { key: "bg_color4", label: "颜色 4" },
                      { key: "bg_color5", label: "颜色 5" },
                      { key: "bg_color6", label: "颜色 6" },
                      { key: "bg_base", label: "底色" },
                    ] as const
                    ).map((field) => (
                      <div key={field.key} className="flex items-center gap-2 border border-border-subtle p-2 bg-surface rounded-lg">
                        <input
                          type="color"
                          value={settings[field.key] || "#000000"}
                          onChange={(e) => setSettingsField(field.key, e.target.value)}
                          className="w-8 h-8 cursor-pointer border-0 bg-transparent p-0"
                        />
                        <div className="min-w-0">
                          <div className="text-label-caps text-outline">{field.label}</div>
                          <div className="text-metadata-sm text-on-surface-variant uppercase">{settings[field.key] || ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
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
          </div>
          )}

          {/* Upload */}
          {activeTab === "upload" && (
          <div>
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
          </div>
          )}

          {/* Photos */}
          {activeTab === "photos" && (
          <div>
            <div className="flex items-center justify-between gap-6 flex-wrap mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <h2 className="text-headline-lg text-primary">照片管理</h2>
                <span className="text-metadata-sm text-outline">
                  {photos.length} 张 · {photos.filter((p) => p.is_published).length} 已发布 · {photos.filter((p) => !p.is_published).length} 草稿
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-auto">
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
                  <div className="flex items-center gap-4 border-b border-border-subtle p-4 text-label-caps text-outline bg-surface-bright">
                    <div className={PHOTO_COL.check}>
                      <Checkbox isSelected={allVisibleSelected} onChange={toggleSelectAll}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
                    </div>
                    <div className={PHOTO_COL.preview}>预览</div>
                    <div className={PHOTO_COL.title}>标题</div>
                    <div className={PHOTO_COL.date}>拍摄日期</div>
                    <div className={PHOTO_COL.status}>状态</div>
                    <div className={PHOTO_COL.actions}>操作</div>
                  </div>

                  {filteredPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className={`flex items-center gap-4 border-b border-border-subtle p-4 transition-colors ${
                        selected.has(photo.id) ? "bg-accent-soft/50" : "hover:bg-accent-soft/20"
                      }`}
                    >
                      <div className={PHOTO_COL.check}>
                        <Checkbox isSelected={selected.has(photo.id)} onChange={() => toggleSelect(photo.id)}>
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                          </Checkbox.Content>
                        </Checkbox>
                      </div>
                      <div className={PHOTO_COL.preview}>
                        <a href={`/photo/${photo.id}`} className="w-16 h-16 bg-surface-container overflow-hidden border border-border-subtle block rounded-lg">
                          <img src={adminPhotoUrl(photo.id)} alt={photo.title} className="w-full h-full object-cover" />
                        </a>
                      </div>
                      <div className={`${PHOTO_COL.title} text-body-md text-on-surface truncate`}>
                        {photo.title || "无标题"}
                      </div>
                      <div className={`${PHOTO_COL.date} text-metadata-sm text-on-surface-variant`}>
                        {formatDate(photo.shoot_time) || "—"}
                        <div className="mt-1">
                          <Chip size="sm" variant="soft">
                            <Chip.Label>上传于 {formatDate(photo.created_at) || "—"}</Chip.Label>
                          </Chip>
                        </div>
                      </div>
                      <div className={PHOTO_COL.status}>
                        <button onClick={() => handleTogglePublish(photo)} className="rounded-none">
                          <Chip size="sm" color={photo.is_published ? "success" : "default"} variant="soft">
                            <Chip.Label>{photo.is_published ? "已发布" : "草稿"}</Chip.Label>
                          </Chip>
                        </button>
                      </div>
                      <div className={PHOTO_COL.actions}>
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
          </div>
          )}

          {/* Albums */}
          {activeTab === "albums" && (
          <div>
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
                  <div key={album.id} className="border border-border-subtle bg-surface overflow-hidden">
                    <a href={`/album/${album.slug}`} className="block aspect-[4/3] bg-surface-container relative">
                      {album.cover_photo_id ? (
                        <img src={adminPhotoUrl(album.cover_photo_id)} alt="" className="w-full h-full object-cover" />
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
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Blog */}
          {activeTab === "blog" && (
          <div>
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
                <div className="flex items-center gap-4 border-b border-border-subtle p-4 text-label-caps text-outline bg-surface-bright">
                  <div className={BLOG_COL.title}>标题</div>
                  <div className={BLOG_COL.slug}>别名</div>
                  <div className={BLOG_COL.status}>状态</div>
                  <div className={BLOG_COL.actions}>操作</div>
                </div>
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center gap-4 border-b border-border-subtle p-4 hover:bg-accent-soft/20 transition-colors"
                  >
                    <div className={BLOG_COL.title}>
                      <div className="text-body-md text-on-surface truncate font-medium">{article.title || "无标题"}</div>
                      <div className="text-metadata-sm text-outline mt-0.5">
                        {new Date(article.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })} · {article.views} 次浏览
                      </div>
                    </div>
                    <div className={`${BLOG_COL.slug} text-metadata-sm text-on-surface-variant truncate`}>
                      /blog/{article.slug}
                    </div>
                    <div className={BLOG_COL.status}>
                      <button onClick={() => handleToggleArticlePublish(article)} className="rounded-none">
                        <Chip size="sm" color={article.is_published ? "success" : "default"} variant="soft">
                          <Chip.Label>{article.is_published ? "已发布" : "草稿"}</Chip.Label>
                        </Chip>
                      </button>
                    </div>
                    <div className={BLOG_COL.actions}>
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
          </div>
          )}

          {/* Analytics */}
          {activeTab === "analytics" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-headline-lg text-primary">访问分析</h2>
              <Button size="sm" variant="tertiary" onPress={loadAnalytics}>
                刷新
              </Button>
            </div>

            {!analytics ? (
              /* 逐块照抄下方真实布局的行列与间距类，条高取文本行盒高度，故加载前后总高基本不变 */
              <div role="status" aria-label="正在加载访问分析" className="relative flex flex-col gap-8">
                {/* 绝对定位在标题行下方的 24px 空档里，可见但不额外撑高 */}
                <p className="absolute top-[-24px] left-0 text-metadata-sm text-outline">
                  正在加载访问分析...
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-[38.4px] w-3/5 rounded-lg" />
                      <Skeleton className="h-2.5 w-2/5 rounded-md" />
                    </Card>
                  ))}
                </div>

                <div>
                  <div className="border-b border-primary/15 pb-2 mb-3">
                    <Skeleton className="h-2.5 w-24" />
                  </div>
                  <Skeleton className="h-32 w-full rounded-lg" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {[0, 1, 2].map((i) => (
                    <div key={i}>
                      <div className="border-b border-primary/15 pb-2 mb-3">
                        <Skeleton className="h-2.5 w-24" />
                      </div>
                      <div className="flex flex-col gap-2">
                        {[0, 1, 2, 3].map((j) => (
                          <Skeleton key={j} className="h-[16.8px] w-full" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
                    {analytics.daily.map((d) => {
                      const max = Math.max(...analytics.daily.map((x) => x.pv), 1);
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
                      {analytics.top_pages.map((p) => (
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
                      {analytics.top_photos.map((p) => (
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
                      {analytics.top_articles.map((a) => (
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

          {/* Services */}
          {activeTab === "services" && (
          <div>
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
              {displayServices.map((s) => (
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
          </div>
          )}

          {/* 地图 */}
          {activeTab === "map" && (
          <div>
            <h2 className="text-headline-lg text-primary mb-6">地图</h2>

            {/* ① 默认底图 */}
            <section className="mb-10">
              <MapSectionHeading
                title="默认底图"
                hint="只影响首次访客；访客自己动过图层选择器的话，他的浏览器记忆优先。"
              />
              <Card className="p-5 gap-4">
                {!mapCfg ? (
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: TILE_LAYERS.length }).map((_, i) => (
                      <Skeleton key={i} className="h-[116px] w-[92px] rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-metadata-sm text-on-surface-variant">
                      当前：
                      <span className="font-medium text-primary">
                        {layerKnown ? savedLayer : `${savedLayer || "（空）"}`}
                      </span>
                      {savedLayer && !layerKnown && (
                        <span className="text-[var(--danger)]">
                          {" "}· 这个名字在图层表里找不到，前端按 {FALLBACK_LAYER_NAME} 兜底
                        </span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {TILE_LAYERS.map((def) => {
                        const on = savedLayer === def.name;
                        return (
                          <button
                            key={def.name}
                            type="button"
                            aria-pressed={on}
                            disabled={mapCfgSaving}
                            onClick={() => !on && saveMapSetting({ default_map_layer: def.name })}
                            className={`relative flex w-[92px] flex-col items-center gap-1 rounded-lg border p-1.5 pb-2 transition-all disabled:opacity-60 ${
                              on
                                ? "border-primary opacity-100 ring-2 ring-primary/70 ring-offset-1 ring-offset-surface saturate-100"
                                : "border-border-subtle opacity-75 saturate-50 hover:border-primary/50 hover:opacity-100 hover:saturate-100"
                            }`}
                          >
                            <img
                              src={schemeThumb(def.thumb)}
                              alt=""
                              className="aspect-square w-full rounded"
                            />
                            <span
                              className={`w-full truncate text-center text-[11px] leading-tight ${
                                on ? "text-primary font-medium" : "text-outline"
                              }`}
                            >
                              {def.name}
                            </span>
                            {on && (
                              <span
                                aria-hidden
                                className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-primary text-[var(--color-on-primary)] shadow-sm"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                                  check
                                </span>
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </Card>
            </section>

            {/* ② 底图密钥：客户端密钥，值必然下发到浏览器 */}
            <section className="mb-10">
              <MapSectionHeading
                title="底图密钥"
                hint="去掉 Light / Dark / Voyager 底图的水印。"
              />
              <Card className="p-5">
                <div className="flex max-w-xl flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-md text-on-surface font-medium">CARTO 底图 API Key</span>
                    <Chip size="sm" color={cartoCred?.configured ? "success" : "warning"} variant="soft">
                      <Chip.Label>
                        {cartoCred?.configured ? `已配置（${cartoCred.length} 位）` : "未配置"}
                      </Chip.Label>
                    </Chip>
                  </div>

                  <LabeledInput
                    label="粘贴新的 Key"
                    value={cartoKey}
                    onChange={(v) => {
                      setCartoKey(v);
                      setCartoDirty(true);
                      setCartoVerify(null);
                    }}
                    placeholder={
                      cartoCred?.configured
                        ? "不回显当前值；输入即替换，留空即清除"
                        : "尚未配置，底图当前带水印"
                    }
                  />

                  <div className="flex flex-wrap items-center gap-x-3 text-metadata-sm text-outline">
                    <a
                      className="text-primary underline underline-offset-2"
                      href="https://carto.com/basemaps/apikey/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      申请 key
                    </a>
                    <a
                      className="text-primary underline underline-offset-2"
                      href="https://dashboard.basemaps.carto.com"
                      target="_blank"
                      rel="noreferrer"
                    >
                      管理 key
                    </a>
                  </div>

                  {cartoVerify && (
                    <div
                      className={`flex items-start gap-2 rounded-lg border p-3 text-metadata-sm ${
                        cartoVerify.ok
                          ? "border-[var(--accent)]/40 bg-accent-soft/30"
                          : "border-[var(--danger)]/40 bg-danger-soft/30"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined ${cartoVerify.ok ? "text-[var(--accent)]" : "text-[var(--danger)]"}`}
                        style={{ fontSize: 18 }}
                      >
                        {cartoVerify.ok ? "check_circle" : "error"}
                      </span>
                      <span className={cartoVerify.ok ? "text-primary" : "text-[var(--danger)]"}>
                        {cartoVerify.detail}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      isDisabled={!cartoDirty}
                      isPending={cartoSaving}
                      onPress={saveCartoKey}
                    >
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="tertiary"
                      isPending={cartoVerifying}
                      onPress={verifyCartoKey}
                    >
                      验证
                    </Button>
                  </div>
                </div>
              </Card>
            </section>

            {/* ③ OSM 瓦片源 */}
            <section>
              <MapSectionHeading
                title="OSM 瓦片源"
                hint="只影响 Streets 这一个图层。"
              />
              <Card className="p-4">
                <div className="flex max-w-xl flex-col gap-2">
                  {!mapCfg
                    ? [0, 1].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
                    : OSM_SOURCE_OPTIONS.map((o) => {
                        const on = mapCfg.osm_tile_source === o.value;
                        return (
                          <button
                            key={o.value}
                            type="button"
                            aria-pressed={on}
                            disabled={mapCfgSaving}
                            onClick={() => !on && saveMapSetting({ osm_tile_source: o.value })}
                            className={`flex min-h-14 flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-60 ${
                              on
                                ? "border-primary bg-primary/5 ring-1 ring-primary/60"
                                : "border-border-subtle hover:border-primary/50"
                            }`}
                          >
                            <span
                              aria-hidden
                              className={`w-3 h-3 flex-shrink-0 rounded-full ${
                                on ? "bg-primary" : "border-2 border-[var(--muted)]"
                              }`}
                            />
                            <span className="text-body-md text-on-surface font-medium">
                              {o.label}
                            </span>
                            <code className="font-mono text-metadata-sm text-outline">
                              {o.host}
                            </code>
                            {o.warn && (
                              <Chip size="sm" color="warning" variant="soft">
                                <Chip.Label>{o.warn}</Chip.Label>
                              </Chip>
                            )}
                            {on && (
                              <Chip size="sm" variant="soft">
                                <Chip.Label>使用中</Chip.Label>
                              </Chip>
                            )}
                            <span className="w-full text-metadata-sm text-outline sm:w-auto">
                              {o.note}
                            </span>
                          </button>
                        );
                      })}
                </div>
              </Card>
            </section>
          </div>
          )}

          {/* Users */}
          {activeTab === "users" && (
          <div>
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
          </div>
          )}
          </div>
        </main>
      </div>

      {/* 移动端功能导航抽屉 */}
      <Drawer.Backdrop
        isOpen={navDrawerState.isOpen}
        onOpenChange={navDrawerState.setOpen}
      >
        <Drawer.Content placement="left">
          <Drawer.Dialog>
            <Drawer.CloseTrigger />
            <Drawer.Header>
              <Drawer.Heading className="text-label-caps text-on-surface-variant">
                功能导航
              </Drawer.Heading>
            </Drawer.Header>
            <Drawer.Body className="pt-2 px-3">
              <NavList
                activeTab={activeTab}
                onSelect={handleTabSwitch}
                moreExpanded={moreExpanded}
                onToggleMore={toggleMore}
                groupSuffix="drawer"
                collapsed={false}
              />
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>

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
                        !photos.some((p) => p.album_id === albumModal?.album?.id && p.id === albumModal?.album?.cover_photo_id) && (
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
    </div>
  );
}
