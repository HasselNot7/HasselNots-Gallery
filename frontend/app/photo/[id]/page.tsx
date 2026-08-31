import { fetchPhoto, getPhotoImageUrl, Photo } from "@/lib/api-server";
import PhotoTags from "@/components/PhotoTags";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PhotoLocationPanel from "@/components/PhotoLocationPanel";
import ViewCounter from "@/components/ViewCounter";
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

  const exifFields = [
    { label: "CAMERA", value: photo.camera_model },
    { label: "LENS", value: photo.lens_model },
    { label: "APERTURE", value: photo.aperture },
    { label: "SHUTTER", value: photo.shutter_speed },
    { label: "ISO", value: photo.iso },
    { label: "FOCAL LENGTH", value: photo.focal_length },
  ];
  const hasExif = exifFields.some((f) => f.value);

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
              <div className="border border-border-subtle overflow-hidden">
                <img
                  src={getPhotoImageUrl(photo.id)}
                  alt={photo.title}
                  className="w-full h-auto object-contain bg-surface-dim"
                  style={{ maxHeight: "80vh" }}
                />
              </div>
            </PhotoLightbox>
          </div>

          <div className="lg:col-span-4">
            <div className="sticky top-[84px] md:top-[100px] flex flex-col gap-6">
              <div className="border-b border-border-subtle pb-4">
                <h1 className="text-headline-lg text-primary mb-1">{photo.title || "Untitled"}</h1>
                <div className="flex items-center gap-3 text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', 'Noto Serif SC', monospace" }}>
                  {shootDate && <span>{shootDate}</span>}
                  <ViewCounter kind="photo" slug={String(photo.id)} currentViews={photo.views} />
                </div>
              </div>

              {hasExif && (
                <div className="bg-surface-container-low border border-border-subtle p-6 flex flex-col gap-4 rounded-md">
                  <h2 className="text-body-md font-bold text-primary tracking-widest pb-4 border-b border-border-subtle mb-6">
                    EXIF &amp; TECHNICAL
                  </h2>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-metadata-sm text-on-surface">
                    {exifFields.map(
                      (f) =>
                        f.value && (
                          <div key={f.label} className="flex flex-col">
                            <span className="text-outline text-[10px] mb-1">{f.label}</span>
                            <span>{f.value}</span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

              {photo.description && (
                <p className="text-body-md text-on-surface-variant">{photo.description}</p>
              )}

              <PhotoTags
                cameraModel={photo.camera_model}
                latitude={photo.latitude}
                longitude={photo.longitude}
              />

              <div className="grid grid-cols-2 gap-2 text-metadata-sm">
                <div className="text-outline text-[10px]">
                  Dimensions<br />
                  <span className="text-on-surface">{photo.image_width} × {photo.image_height}px</span>
                </div>
                {photo.altitude != null && (
                  <div className="text-outline text-[10px]">
                    Altitude<br />
                    <span className="text-on-surface">{Number(photo.altitude).toFixed(1)}m</span>
                  </div>
                )}
              </div>
            </div>
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
