/**
 * The Media page's own copy, read at build time from the WordPress page Meg
 * edits (Sprint 11 Phase 3).
 *
 * Values come from the ACF fields on WP page 10 ("Media"), fetched by
 * scripts/fetch-wp-content.mjs into src/generated/wp-content/media.json and
 * statically imported here — /media is a dynamic route and the Vercel runtime
 * cannot reach admin.megcmusic.com, so the read must happen on the build
 * runner. See src/lib/epk-content.ts for the full reasoning.
 *
 * The videos and the photo gallery are NOT here: videos come from
 * src/lib/videos-content.ts (a separate WP page), photos from Meg's /photos
 * page body, parsed at request time with a browser-side fallback.
 */

import acf from "@/generated/wp-content/media.json";

interface MediaContent {
  pageLede: string;
  metaTitle: string;
  metaDescription: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");

const content: MediaContent = {
  pageLede: text(acf.page_lede),
  metaTitle: text(acf.meta_title),
  metaDescription: text(acf.meta_description),
};

export async function getMediaContent(): Promise<MediaContent> {
  return content;
}
