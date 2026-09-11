/**
 * Behold feed plumbing. Behold (behold.so) serves Meg's recent Instagram posts
 * as public JSON; it is NOT the WP host, so it isn't datacenter-blocked. With
 * no feed id the section renders its intentional unconfigured state (handle +
 * follow link, no broken grid) rather than an empty grid.
 *
 * Both env names are accepted. The id lived in `BEHOLD_FEED_ID` until the
 * 2026-07-05 rename to `NEXT_PUBLIC_BEHOLD_FEED_ID` (decisions.md), and only
 * the code and `.env.local.example` were renamed — an id set in a deploy
 * environment under the old name would read as unset and leave the feed dark
 * with no error anywhere. Reading both makes that unrecoverable-looking state
 * impossible; neither name needs `NEXT_PUBLIC_` (this is read in a server
 * component only), so the plain one is the better name to set going forward.
 *
 * Her handle and the footer's Facebook/Instagram/YouTube links moved to the WP
 * Home page in Sprint 11 — see src/lib/home-content.ts.
 */
const RAW_BEHOLD_FEED_ID =
  process.env.NEXT_PUBLIC_BEHOLD_FEED_ID || process.env.BEHOLD_FEED_ID || "";

/**
 * Trimmed, because a dashboard textarea will happily store a trailing newline
 * and Behold answers 404 for `<id>%0A` exactly as it does for an id that does
 * not exist — an invisible character that reads as a deleted account.
 */
export const BEHOLD_FEED_ID = RAW_BEHOLD_FEED_ID.trim();

/** Whether the configured id carried surrounding whitespace. Diagnostic only. */
export const BEHOLD_FEED_ID_WAS_PADDED =
  RAW_BEHOLD_FEED_ID.length !== BEHOLD_FEED_ID.length;

export interface BeholdPost {
  id: string;
  permalink: string;
  thumbUrl: string;
  alt: string;
}

/** Parse Behold's feed JSON defensively into the fields we render. */
export function parseBeholdPosts(data: unknown): BeholdPost[] {
  const raw = Array.isArray(data)
    ? data
    : ((data as { posts?: unknown[] })?.posts ?? []);
  const posts: BeholdPost[] = [];
  for (const item of raw) {
    const p = item as Record<string, unknown>;
    const sizes = p.sizes as { small?: { mediaUrl?: string } } | undefined;
    // Behold's own CDN first, deliberately. `thumbnailUrl` is set on video
    // posts only and points straight at `*.cdninstagram.com`, whose URLs are
    // signed, expire, and are hotlink-blocked — they load for whoever fetched
    // the feed and are broken images for everyone else. `sizes.small.mediaUrl`
    // is a behold.pictures URL, present on every post and meant to be embedded.
    // `mediaUrl` is last because on a video post it is the video file, not a
    // poster frame.
    const thumbUrl =
      sizes?.small?.mediaUrl ??
      (p.thumbnailUrl as string) ??
      (p.mediaUrl as string) ??
      "";
    const permalink = (p.permalink as string) ?? "";
    if (!thumbUrl || !permalink) continue;
    posts.push({
      id: (p.id as string) ?? permalink,
      permalink,
      thumbUrl,
      alt:
        typeof p.prompt === "string"
          ? p.prompt
          : typeof p.caption === "string"
            ? (p.caption as string).slice(0, 120)
            : "Instagram post by Meghan Clarisse",
    });
  }
  return posts;
}
