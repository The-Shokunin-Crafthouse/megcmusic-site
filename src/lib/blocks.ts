/**
 * Meg's content blocks — the rows of an SCF Flexible Content field. Three
 * came with Sprint 13's Home zone (`home_blocks`, WP page 4); Sprint 17 adds
 * text and photo and puts all five in every page's "Page layout" list.
 * Pure parsing, unit-tested directly; readers call it on build-time snapshots.
 *
 * Rules (Sprint 13 contract §1.4, kept): a block missing its required field
 * renders nothing; an unknown layout renders nothing and is logged; an empty
 * zone is `[]`.
 */

import { youTubeId } from "@/lib/media-videos";
import { photonUrl } from "@/lib/media-photos";

/** Photon width for a photo block at the zone's full measure (1000 px, 2×). */
const PHOTO_WIDTH = 1600;

export type Block =
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
  | { layout: "video"; id: string; caption: string }
  | { layout: "text"; heading: string; paragraphs: string[] }
  | {
      layout: "photo";
      /** Sized through Photon, on the WordPress host. */
      src: string;
      /** Intrinsic size as the media library reports it; 0 when unknown. */
      width: number;
      height: number;
      /** The media library's alt text — empty means decorative. */
      alt: string;
      caption: string;
    };

export const BLOCK_LAYOUTS = ["announcement", "pull_quote", "video", "text", "photo"] as const;

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);

/** Paragraphs from a textarea: blank lines split, single newlines join. */
function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** One row → one block, or null when the row cannot render. Unknown layouts
 *  are null too; the caller decides whether to log them. */
export function parseBlock(row: unknown): Block | null {
  const r = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
  const layout = text(r.acf_fc_layout);
  switch (layout) {
    case "announcement": {
      const headline = text(r.headline);
      if (!headline) return null;
      const linkLabel = text(r.link_label);
      const linkUrl = text(r.link_url);
      const link = linkLabel && linkUrl ? { linkLabel, linkUrl } : { linkLabel: "", linkUrl: "" };
      return { layout, eyebrow: text(r.eyebrow), headline, body: text(r.body), ...link };
    }
    case "pull_quote": {
      const quote = text(r.quote);
      if (!quote) return null;
      return { layout, quote, attribution: text(r.attribution) };
    }
    case "video": {
      const id = youTubeId(text(r.youtube_url));
      if (!id) return null;
      return { layout, id, caption: text(r.caption) };
    }
    case "text": {
      const heading = text(r.heading);
      const paras = paragraphs(text(r.body));
      if (!heading || !paras.length) return null;
      return { layout, heading, paragraphs: paras };
    }
    case "photo": {
      const image = (r.image && typeof r.image === "object" ? r.image : {}) as Record<string, unknown>;
      const url = text(image.url);
      if (!url) return null;
      return {
        layout,
        src: photonUrl(url, PHOTO_WIDTH),
        width: num(image.width),
        height: num(image.height),
        alt: text(image.alt),
        caption: text(r.caption),
      };
    }
    default:
      return null;
  }
}

export const isBlockLayout = (layout: string): boolean =>
  (BLOCK_LAYOUTS as readonly string[]).includes(layout);

/** ACF returns `false` for an empty Flexible Content field and an array of
 *  `{ acf_fc_layout, …fields }` rows otherwise. */
export function parseBlocks(
  raw: unknown,
  log: (message: string) => void = (m) => console.warn(m),
): Block[] {
  if (!Array.isArray(raw)) return [];
  const out: Block[] = [];
  raw.forEach((row, i) => {
    const layout = text((row as Record<string, unknown> | null)?.acf_fc_layout);
    if (!isBlockLayout(layout)) {
      log(`blocks: row ${i + 1} has unknown layout "${layout}" — rendering nothing for it`);
      return;
    }
    const block = parseBlock(row);
    if (block) out.push(block);
  });
  return out;
}
