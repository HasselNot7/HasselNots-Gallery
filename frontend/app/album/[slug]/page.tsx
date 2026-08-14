import { fetchAlbums, fetchAlbumPhotos, getPhotoImageUrl } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AlbumGrid from "@/components/AlbumGrid";

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let album: Awaited<ReturnType<typeof fetchAlbums>>[number] | null = null;
  let photos: Awaited<ReturnType<typeof fetchAlbumPhotos>> = [];
  try {
    const albums = await fetchAlbums();
    album = albums.find((a) => a.slug === slug) || null;
    if (album) photos = await fetchAlbumPhotos(album.id);
  } catch {
    // backend unavailable
  }

  if (!album) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-headline-mobile text-on-surface-variant">Album not found</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-7xl mx-auto w-full">
        <a
          href="/albums"
          className="inline-flex items-center gap-2 text-label-caps text-on-surface-variant hover:text-primary transition-colors mb-8"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Albums
        </a>

        <div className="mb-10">
          <h1 className="text-headline-lg md:text-display-lg text-primary mb-3 uppercase" style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', sans-serif" }}>
            {album.title}
          </h1>
          {album.description && (
            <p className="text-body-md text-on-surface-variant max-w-2xl mb-3">{album.description}</p>
          )}
          <span className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {photos.length} PHOTOS
          </span>
        </div>

        {photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4">photo_library</span>
            <p className="text-headline-mobile text-on-surface-variant">No photos in this album</p>
          </div>
        ) : (
          <AlbumGrid photos={photos} />
        )}
      </main>
      <Footer />
    </div>
  );
}
