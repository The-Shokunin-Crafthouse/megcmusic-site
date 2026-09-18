import { SectionLabel } from "../SectionLabel/SectionLabel";
import { HOME_CONTENT } from "@/lib/home-content";
import { BlockRenderer } from "./BlockRenderer";
import styles from "./BlockRun.module.css";

/**
 * Meg's Home blocks zone (Sprint 13; "What's New" section in the Sprint 17
 * page layout) — after Instagram, before the press-kit teaser by default. Renders nothing at all while the zone is empty, so Home is
 * identical to a Home without it (the Phase 0 parity baseline). With blocks,
 * it is a named region under a ★★★ label like every other section.
 */
export function WhatsNew() {
  const blocks = HOME_CONTENT.blocks;
  if (blocks.length === 0) return null;
  return (
    <section className={styles.section} aria-labelledby="home-blocks-heading">
      <div className={styles.inner}>
        <SectionLabel id="home-blocks-heading">What&rsquo;s New</SectionLabel>
        <div className={styles.blocks}>
          {blocks.map((block, i) => (
            <BlockRenderer key={`${block.layout}-${i}`} block={block} />
          ))}
        </div>
      </div>
    </section>
  );
}
