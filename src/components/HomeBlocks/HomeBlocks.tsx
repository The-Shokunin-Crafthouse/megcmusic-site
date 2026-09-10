import { HOME_CONTENT } from "@/lib/home-content";
import { BlockRenderer } from "./BlockRenderer";

/**
 * Meg's Home blocks zone (Sprint 13) — sits after Instagram, before the
 * press-kit teaser. Renders nothing at all while the zone is empty, so Home
 * is byte-identical to a Home without it (the Phase 0 parity baseline).
 */
export function HomeBlocks() {
  const blocks = HOME_CONTENT.blocks;
  if (blocks.length === 0) return null;
  return (
    <section aria-label="What's new">
      {blocks.map((block, i) => (
        <BlockRenderer key={`${block.layout}-${i}`} block={block} />
      ))}
    </section>
  );
}
