/**
 * Which videos show on Home and the Media page, read at build time from the
 * WordPress page Meg edits (Sprint 11 Phase 3 — supersedes the `primaryVideoId`
 * and `seedVideoIds` lists in src/config/videos.ts).
 *
 * Values come from the ACF fields on WP page 5560 ("Videos"), fetched by
 * scripts/fetch-wp-content.mjs into src/generated/wp-content/videos.json and
 * statically imported here. See src/lib/epk-content.ts for why the read is a
 * prebuild step rather than a fetch inside the page.
 *
 * These are the SERVER list. VideosGallery still reconciles against Meg's
 * Videos page from the visitor's browser, so a YouTube block she pastes into
 * the page body (rather than the field list) keeps appearing as it does today.
 */

import acf from "@/generated/wp-content/videos.json";

/** youtube.com/watch?v=…, youtu.be/…, /embed/…, or a bare id → the video id. */
function youtubeId(url: string): string {
  const m =
    url.match(/[?&]v=([\w-]{6,})/) ??
    url.match(/youtu\.be\/([\w-]{6,})/) ??
    url.match(/\/embed\/([\w-]{6,})/) ??
    url.match(/^([\w-]{6,})$/);
  return m?.[1] ?? "";
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

/** Meg's pinned featured tile. Empty when she has not set one — the merge in
 *  src/lib/api/youtube.ts then simply leads with the channel's newest upload. */
export const primaryVideoId: string = youtubeId(text(acf.featured_video_url));

/** Her curated list, in her order. */
export const seedVideoIds: string[] = rows(acf.video_list)
  .map((r) => youtubeId(text(r.youtube_url)))
  .filter(Boolean);
