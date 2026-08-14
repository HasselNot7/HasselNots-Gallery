import { fetchAlbums, fetchAlbumPhotos, getPhotoImageUrl } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {(() => {
              const breakpoints = [
                { at: 0, n: 1 },
                { at: 640, n: 2 },
                { at: 1024, n: 3 },
                { at: 1280, n: 4 },
              ];
              const colCount =
                typeof window === "undefined"
                  ? 3
                  : [...breakpoints].reverse().find((b) => window.innerWidth >= b.at)?.n || 1;
              const columns: typeof photos[][] = Array.from({ length: colCount }, () => []);
              photos.forEach((p, i) => columns[i % colCount].push(p));
              return columns.map((col, c) => (
                <div key={c} className="flex flex-col gap-6 min-w-0">
                  {col.map((photo) => (
                    <a
                      key={photo.id}
                      href={`/photo/${photo.id}`}
                      className="group relative overflow-hidden rounded-lg border border-border-subtle bg-surface block w-full shadow-[0_6px_14px_rgba(0,0,0,0.30),0_22px_52px_rgba(0,0,0,0.38)] transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_14px_32px_rgba(0,0,0,0.44),0_44px_88px_rgba(0,0,0,0.50)]"
                    >
                      <div
                        className="relative w-full overflow-hidden bg-surface-dim"
                        style={{
                          aspectRatio: photo.image_width && photo.image_height
                            ? `${photo.image_width} / ${photo.image_height}`
                            : "4 / 3",
                        }}
                      >
                        <img
                          src={getPhotoImageUrl(photo.id, true)}
                          alt={photo.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/90 to-transparent px-4 py-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                        <span className="text-body-md text-white font-medium truncate block">{photo.title || "Untitled"}</span>
                      </div>
                    </a>
                  ))}
                </div>
              ));
            })()}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
