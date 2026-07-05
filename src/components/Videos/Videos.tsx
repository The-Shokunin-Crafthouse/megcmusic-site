import { SectionLabel } from "../SectionLabel/SectionLabel";
import { getVideos } from "@/lib/api/youtube";
import { VideosGallery } from "./VideosGallery";
import styles from "./Videos.module.css";

// Latest Videos (Figma 39:191) — a featured player beside a playlist. The list
// merges the channel's newest uploads with the curated config (see youtube.ts).
// Embeds are lazy facades (thumbnail + play), so no live iframes ship on load.
export async function Videos() {
  const videos = await getVideos();
  if (videos.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="videos-heading">
      <div className={styles.inner}>
        <SectionLabel id="videos-heading">Latest Videos</SectionLabel>
        <VideosGallery videos={videos} />
      </div>
    </section>
  );
}
