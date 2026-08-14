import { fetchAlbums, getPhotoImageUrl } from "@/lib/api-server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function AlbumsPage() {
  let albums: Awaited<ReturnType<typeof fetchAlbums>> = [];
  try {
    albums = await fetchAlbums();
  } catch {
    // backend unavailable
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-4 md:px-grid-margin py-12 max-w-7xl mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-headline-lg md:text-display-lg text-primary mb-2 uppercase" style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', sans-serif" }}>
            Albums
          </h1>
          <span className="text-metadata-sm text-outline" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {albums.length} COLLECTION{albums.length === 1 ? "" : "S"}
          </span>
        </div>

        {albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-on-surface-variant">
            <span className="material-symbols-outlined text-6xl mb-4">photo_album</span>
            <p className="text-headline-mobile text-on-surface-variant">No albums yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {albums.map((album) => (
              <a
                key={album.id}
                href={`/album/${album.slug}`}
                className="group relative overflow-hidden border border-border-subtle bg-surface aspect-[4/3] block hover:border-primary/40 transition-all duration-500 rounded-lg shadow-[0_6px_14px_rgba(0,0,0,0.30),0_22px_52px_rgba(0,0,0,0.38)] hover:-translate-y-2 hover:shadow-[0_14px_32px_rgba(0,0,0,0.44),0_44px_88px_rgba(0,0,0,0.50)]"
              >
                {album.cover_photo_id ? (
                  <img
                    src={getPhotoImageUrl(album.cover_photo_id, true)}
                    alt={album.title}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-surface-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-outline">photo_album</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-5">
                  <h2 className="text-headline-lg text-white" style={{ fontFamily: "var(--font-sigma), 'Noto Serif SC', sans-serif" }}>
                    {album.title}
                  </h2>
                  {album.description && (
                    <p className="text-body-md text-mint-accent mt-1 line-clamp-2">{album.description}</p>
                  )}
                  <span className="text-metadata-sm text-white/70 mt-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {album.photo_count} PHOTOS
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
