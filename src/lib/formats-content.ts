/**
 * Live formats — how Meg performs (Sprint 16 Phase 2; supersedes
 * src/config/formats.ts). Each card is one WordPress page with the "Live
 * Format" field group: Solo Acoustic (WP 2931) and Full Band (WP 2939). The
 * label and blurb come from the fields; the photo still comes from the page's
 * own body, resolved in the visitor's browser (FormatCard), so Meg swaps it by
 * changing the image on that page as before.
 */

import solo from "@/generated/wp-content/solo-acoustic.json";
import band from "@/generated/wp-content/full-band.json";

export interface LiveFormat {
  /** WP page slug — the photo is read from this page's body. */
  slug: string;
  label: string;
  blurb: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

/** Null when the page has no format name: a card with no caption is not a card. */
export function parseFormat(raw: unknown, slug: string): LiveFormat | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const label = text(r.format_label);
  if (!label) return null;
  return { slug, label, blurb: text(r.format_blurb) };
}

/** The two cards, in the page's fixed order. */
export const LIVE_FORMATS: LiveFormat[] = [
  parseFormat(solo, "solo-acoustic"),
  parseFormat(band, "full-band"),
].filter((f): f is LiveFormat => f !== null);
