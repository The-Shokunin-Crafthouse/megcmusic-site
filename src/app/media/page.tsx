import type { Metadata } from "next";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { VideosGallery } from "@/components/Videos/VideosGallery";
import { PhotoGrid } from "@/components/MediaGallery/PhotoGrid";
import { getVideos, type Video } from "@/lib/api/youtube";
import { getPage } from "@/lib/api/wordpress";
import { parsePhotos, type Photo } from "@/lib/media-photos";
import { getMediaContent } from "@/lib/media-content";
import styles from "./media.module.css";
import { heroImage } from "@/lib/hero-images";

// Videos come from YouTube (hourly), photos from her WP /photos page (hourly so a
// new photo appears without a redeploy).
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const media = await getMediaContent();
  return { title: media.metaTitle, description: media.metaDescription };
}

async function safeVideos(): Promise<Video[]> {
  try {
    return await getVideos();
  } catch {
    return [];
  }
}

// Server-side parse of the /photos page. A datacenter-blocked deploy returns
// nothing here; PhotoGrid refetches from the visitor's residential IP.
async function safePhotos(): Promise<Photo[]> {
  try {
    const page = await getPage("photos");
    return page ? parsePhotos(page.content.rendered) : [];
  } catch {
    return [];
  }
}

export default async function MediaPage() {
  const [media, videos, photos] = await Promise.all([
    getMediaContent(),
    safeVideos(),
    safePhotos(),
  ]);

  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src={heroImage("media")}
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className={styles.scrim} aria-hidden="true" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <p className={styles.stars} aria-hidden="true">
              ★★★
            </p>
            <h1 className={styles.title}>Media</h1>
            <p className={styles.lede}>{media.pageLede}</p>
          </div>
        </header>

        {videos.length > 0 && (
          <section className={styles.section} aria-labelledby="media-watch">
            <div className={styles.inner}>
              <SectionLabel id="media-watch">Watch</SectionLabel>
              <VideosGallery videos={videos} />
            </div>
          </section>
        )}

        <section className={styles.section} aria-labelledby="media-photos">
          <div className={styles.inner}>
            <SectionLabel id="media-photos">Photos</SectionLabel>
            <PhotoGrid serverPhotos={photos} />
          </div>
        </section>
      </main>
    </div>
  );
}
