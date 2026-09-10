import type { HomeBlock } from "@/lib/home-blocks";
import { getVideoMeta } from "@/lib/api/youtube";
import { VideoFacade } from "../VideoFacade/VideoFacade";
import styles from "./VideoBlock.module.css";

/**
 * Video block (Sprint 13 Phase 3) — the Videos gallery's featured tile with
 * Meg's link and an optional caption. The title comes from YouTube's oEmbed
 * at build (the same read the gallery makes), so the play button announces
 * the video's name; the caption is hers. An invalid link never reaches here:
 * the parser drops the row.
 */
export async function VideoBlock({ block }: { block: Extract<HomeBlock, { layout: "video" }> }) {
  const { title } = await getVideoMeta(block.id);
  return (
    <figure className={styles.block}>
      <VideoFacade id={block.id} title={title} />
      {block.caption && <figcaption className={styles.caption}>{block.caption}</figcaption>}
    </figure>
  );
}
