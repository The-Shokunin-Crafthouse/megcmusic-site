import type { Block } from "@/lib/blocks";
import { BlockRenderer } from "./BlockRenderer";
import styles from "./BlockRun.module.css";

/**
 * A run of consecutive blocks between two sections (Sprint 17) — the Home
 * zone's panel without its heading, so an announcement, a quote, a video or
 * a photo that Meg drops between sections sits at the section rhythm. A text
 * block is never in a run: it is a section of its own (TextBlock).
 */
export function BlockRun({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0) return null;
  return (
    <div className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.blocks}>
          {blocks.map((block, i) => (
            <BlockRenderer key={`${block.layout}-${i}`} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}
