/**
 * Meg's Home blocks — the SCF Flexible Content zone `home_blocks` on WP page 4
 * (Sprint 13). Pure parsing, so it is unit-tested directly; the reader in
 * home-content.ts calls it on the build-time snapshot.
 *
 * Rules (contract §1.4): a block missing its required field renders nothing;
 * an unknown layout renders nothing and is logged; an empty zone is `[]`, and
 * Home is then byte-identical to a Home with no zone at all.
 */

import { youTubeId } from "@/lib/media-videos";

export type HomeBlock =
  | {
      layout: "announcement";
      eyebrow: string;
      headline: string;
      body: string;
      /** Both present, or neither — a label with no address is not a link. */
      linkLabel: string;
      linkUrl: string;
    }
  | { layout: "pull_quote"; quote: string; attribution: string }
  | { layout: "video"; id: string; caption: string };

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** ACF returns `false` for an empty Flexible Content field and an array of
 *  `{ acf_fc_layout, …fields }` rows otherwise. */
export function parseHomeBlocks(
  raw: unknown,
  log: (message: string) => void = (m) => console.warn(m),
): HomeBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: HomeBlock[] = [];
  raw.forEach((row, i) => {
    const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
    const layout = text(r.acf_fc_layout);
    switch (layout) {
      case "announcement": {
        const headline = text(r.headline);
        if (!headline) return;
        const linkLabel = text(r.link_label);
        const linkUrl = text(r.link_url);
        const link = linkLabel && linkUrl ? { linkLabel, linkUrl } : { linkLabel: "", linkUrl: "" };
        out.push({ layout, eyebrow: text(r.eyebrow), headline, body: text(r.body), ...link });
        return;
      }
      case "pull_quote": {
        const quote = text(r.quote);
        if (!quote) return;
        out.push({ layout, quote, attribution: text(r.attribution) });
        return;
      }
      case "video": {
        const id = youTubeId(text(r.youtube_url));
        if (!id) return;
        out.push({ layout, id, caption: text(r.caption) });
        return;
      }
      default:
        log(`home_blocks: row ${i + 1} has unknown layout "${layout}" — rendering nothing for it`);
    }
  });
  return out;
}
