import { fetchPhoto, getPhotoImageUrl, Photo } from "@/lib/api-server";
import { Card, Separator } from "@heroui/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhotoLocationPanel from "@/components/PhotoLocationPanel";
import ViewCounter from "@/components/ViewCounter";
import PhotoActions from "@/components/PhotoActions";
import CommentSection from "@/components/CommentSection";
import PhotoLightbox from "@/components/PhotoLightbox";
import type { Metadata } from "next";

import { SITE_URL as BASE } from "@/lib/site";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const photo = await fetchPhoto(parseInt(id));
    return {
      title: photo.title || "Photo",
      description: photo.description || (photo.location_name ? `Shot at ${photo.location_name}` : undefined),
      openGraph: {
        title: photo.title || "Photo",
        description: photo.description || undefined,
        type: "website",
        images: [{ url: `${BASE}${getPhotoImageUrl(photo.id)}` }],
      },
    };
  } catch {
    return { title: "Photo" };
  }
}

/** 行首图标。连字名必须 aria-hidden，否则读屏会念出 "photo_camera" 这种字形名；
    与值同基线时 12px 图标的墨迹中心比数字高约 1.25px（4x 截图量得），下移补回 */
function SpecIcon({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="material-symbols-outlined shrink-0 text-outline"
      style={{ fontSize: 12, transform: "translateY(1.25px)" }}
    >
      {name}
    </span>
  );
}

/* 参数瓷砖：整行一块，左侧只用图标标识、值靠右且强制一行，超长的（镜头全名）截断，
   悬停看全称——完整文本一直在 DOM 里，只是被裁掉。ISO 例外，值前留 “ISO” 文字，
   否则只剩一个数字读不出是什么 */
function ExifTile({
  icon,
  label,
  prefix,
  value,
}: {
  icon: string;
  label: string;
  prefix?: string;
  value: string;
}) {
  const text = prefix ? `${prefix} ${value}` : value;
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-lg border border-border-subtle bg-surface px-3 py-2">
      <span className="sr-only">{label}</span>
      <SpecIcon name={icon} />
      <span className="text-metadata-sm min-w-0 truncate text-[13px] text-on-surface" title={text}>
        {text}
      </span>
    </div>
  );
}

/* 透明左右边框 + px-3 是为了凑出瓷砖那 1px 框 + 12px 内边距，图标才和上面各块对齐 */
function SpecRow({ icon, label, v }: { icon: string; label: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-x border-transparent px-3">
      <span className="sr-only">{label}</span>
      <SpecIcon name={icon} />
      <span className="text-metadata-sm min-w-0 text-on-surface">{v}</span>
    </div>
  );
}

export default async function PhotoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let photo: Photo | null = null;

  try {
    photo = await fetchPhoto(parseInt(id));
  } catch {
    // photo not found or backend unavailable
  }

  if (!photo) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-headline-mobile text-on-surface-variant">Photo not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  // label 只喂给「复制 EXIF」，瓷砖上靠图标认
  const tile = (icon: string, label: string, raw: string | null | undefined, prefix?: string) =>
    raw ? { icon, label, prefix, value: raw } : null;
  const deviceFields = [
    tile("photo_camera", "CAMERA", photo.camera_model),
    // 连字名和字形对不上：camera 是光圈叶片（所以给光圈），镜头用镜圈加对焦框的 center_focus_strong
    // ——camera_videobadge 更像镜头但占 2em 宽，会把图标列撑歪
    tile("center_focus_strong", "LENS", photo.lens_model),
  ].filter((f) => f !== null);
  const exposureFields = [
    tile("camera", "APERTURE", photo.aperture),
    tile("shutter_speed", "SHUTTER", photo.shutter_speed),
    tile("grain", "ISO", photo.iso, "ISO"),
    tile("straighten", "FOCAL", photo.focal_length),
  ].filter((f) => f !== null);
  const megapixels = ((photo.image_width * photo.image_height) / 1e6).toFixed(1);
  const coordText =
    photo.latitude != null && photo.longitude != null
      ? `${photo.latitude.toFixed(4)}, ${photo.longitude.toFixed(4)}`
      : "";
  const exifText = [
    `${photo.title || photo.filename}`,
    ...[...deviceFields, ...exposureFields].map((f) => `${f.label}: ${f.value}`),
    `DIMENSIONS: ${photo.image_width} x ${photo.image_height} px (${megapixels} MP)`,
    photo.location_name && `LOCATION: ${photo.location_name}`,
    coordText && `COORDS: ${coordText}`,
  ]
    .filter(Boolean)
    .join("\n");

  const shootDate = photo.shoot_time
    ? new Date(photo.shoot_time).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-7xl mx-auto border-x border-border-subtle">
        <a
          href="/gallery"
          className="inline-flex items-center gap-2 text-label-caps text-on-surface-variant hover:text-primary transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Gallery
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-8">
            <PhotoLightbox src={getPhotoImageUrl(photo.id)} alt={photo.title || "Untitled"}>
              {/* img 自己收缩到实际成像尺寸：w-full 配 maxHeight 会让竖幅照片在框里左右留白，
                  露出的是 img 的底色而不是页面背景 */}
              <img
                src={getPhotoImageUrl(photo.id)}
                alt={photo.title}
                className="mx-auto block max-h-[80vh] w-auto max-w-full rounded-2xl border border-border-subtle shadow-lg"
              />
            </PhotoLightbox>
          </div>

          <div className="lg:col-span-4">
            <Card className="gap-5 rounded-2xl border border-border-subtle bg-surface p-5 shadow-surface md:p-6">
              {/* 图标钮只与标题同行：日期/浏览数占满整行宽，不会被挤成两行 */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-3">
                  {/* 标题常是 MVIMG_20260817_224317 这类无空格长串：下划线不给折行机会，
                      min-width 默认 auto 会让它撑破整行、把右侧图标顶出卡片，min-w-0 才轮得到 break-words */}
                  <h1 className="text-headline-lg min-w-0 break-words text-primary">{photo.title || "Untitled"}</h1>
                  <PhotoActions exifText={exifText} href={getPhotoImageUrl(photo.id)} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-metadata-sm text-on-surface-variant">
                  {shootDate && (
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
                      <span className="material-symbols-outlined text-outline" style={{ fontSize: 14 }}>
                        calendar_month
                      </span>
                      {shootDate}
                    </span>
                  )}
                  <ViewCounter kind="photo" slug={String(photo.id)} currentViews={photo.views} />
                </div>
              </div>

              {photo.description && (
                <p className="text-body-md break-words text-on-surface-variant">{photo.description}</p>
              )}

              <section className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-container-low p-3.5">
                <header className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 16 }}>
                      tune
                    </span>
                    <h2 className="truncate text-label-caps text-primary" style={{ fontFamily: "var(--font-display)" }}>
                      EXIF &amp; TECHNICAL
                    </h2>
                  </div>
                </header>

                {/* 各占一整行：侧栏只有 ~330px，并排时最长值 1/10000s 会顶穿瓷砖边框 */}
                {[...deviceFields, ...exposureFields].length > 0 && (
                  <div className="flex flex-col gap-2">
                    {[...deviceFields, ...exposureFields].map((f) => (
                      <ExifTile key={f.label} icon={f.icon} label={f.label} prefix={f.prefix} value={f.value} />
                    ))}
                  </div>
                )}

                <Separator />
                <div className="flex flex-col gap-1.5">
                  <SpecRow icon="aspect_ratio" label="Dimensions" v={`${photo.image_width} × ${photo.image_height} px · ${megapixels} MP`} />
                  {photo.altitude != null && <SpecRow icon="altitude" label="Altitude" v={`${Number(photo.altitude).toFixed(1)} m`} />}
                  {coordText && <SpecRow icon="my_location" label="Coordinates" v={coordText} />}
                </div>
              </section>

            </Card>
          </div>
        </div>

        <PhotoLocationPanel
          photoId={photo.id}
          latitude={photo.latitude}
          longitude={photo.longitude}
          originalLatitude={photo.original_latitude}
          originalLongitude={photo.original_longitude}
          locationName={photo.location_name}
          title={photo.title}
          thumbnail={getPhotoImageUrl(photo.id, true)}
          camera={photo.camera_model}
        />

        <CommentSection photoId={photo.id} title={`Comments (${photo.title || "Untitled"})`} />
      </main>
      <Footer />
    </div>
  );
}
