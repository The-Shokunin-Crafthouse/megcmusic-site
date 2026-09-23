/**
 * The picture of each press-kit download, made from the file itself at build
 * time by scripts/fetch-epk-thumbs.mjs (ADR 2026-09-23). Keyed by the file's
 * URL, which is the row's download link. A row with no picture — a link row,
 * a file type that has no first page, or a file that could not be drawn —
 * gets null, and the teaser shows the site photo as before.
 */

import manifest from "@/generated/epk-thumbs.json";

export interface EpkThumb {
  src: string;
  srcSet: string;
  width: number;
  height: number;
}

const THUMBS = manifest as Record<string, EpkThumb>;

export function epkThumb(href: string | null): EpkThumb | null {
  return href ? (THUMBS[href] ?? null) : null;
}
