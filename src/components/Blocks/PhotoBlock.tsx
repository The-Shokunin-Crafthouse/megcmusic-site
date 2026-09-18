import type { Block } from "@/lib/blocks";
import styles from "./PhotoBlock.module.css";

/**
 * Photo block (Sprint 17) — one of Meg's uploads at the zone's full measure,
 * served through Photon like the media gallery, with an optional caption in
 * the attribution voice (the video block's caption). The alt text is the
 * media library's; empty alt means decorative, which the image then is. The
 * intrinsic size reserves the box so nothing shifts as it loads; when the
 * library gave no size the image sizes itself. Nothing interactive. Spec:
 * _config/design-system/a11y-spec.md.
 */
export function PhotoBlock({ block }: { block: Extract<Block, { layout: "photo" }> }) {
  const sized = block.width > 0 && block.height > 0;
  return (
    <figure className={styles.block}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={styles.img}
        src={block.src}
        alt={block.alt}
        {...(sized ? { width: block.width, height: block.height } : {})}
        loading="lazy"
        decoding="async"
      />
      {block.caption && <figcaption className={styles.caption}>{block.caption}</figcaption>}
    </figure>
  );
}
