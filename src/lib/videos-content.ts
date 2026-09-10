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
import { youTubeId } from "@/lib/media-videos";

/** Any YouTube link Meg might paste — watch, youtu.be, embed, Shorts, or a
 *  bare id — to its id, or "" when it is not one. One parser for the site:
 *  a private copy here missed `/shorts/` and silently dropped the first
 *  Shorts link she added (2026-09-10). */
const youtubeId = (url: string): string => youTubeId(url) ?? "";

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

/** Meg's pinned featured tile. Empty when she has not set one — the merge in
 *  src/lib/video-merge.ts then simply leads with the first video in her list. */
export const primaryVideoId: string = youtubeId(text(acf.featured_video_url));

/** Her curated list, in her order — it comes right after the featured tile and
 *  ahead of the channel's newest uploads (src/lib/video-merge.ts). */
export const seedVideoIds: string[] = rows(acf.video_list)
  .map((r) => youtubeId(text(r.youtube_url)))
  .filter(Boolean);
