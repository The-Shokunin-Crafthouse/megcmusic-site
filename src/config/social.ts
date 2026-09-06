/**
 * Behold feed plumbing. Behold (behold.so) serves Meg's recent Instagram posts
 * as public JSON; it is NOT the WP host, so it isn't datacenter-blocked. The
 * account isn't connected yet: leave BEHOLD_FEED_ID unset and the section
 * renders its intentional unconfigured state (handle + follow link, no broken
 * grid). It lights up the moment the id is set in NEXT_PUBLIC_BEHOLD_FEED_ID.
 *
 * Her handle and the footer's Facebook/Instagram/YouTube links moved to the WP
 * Home page in Sprint 11 — see src/lib/home-content.ts.
 */
export const BEHOLD_FEED_ID = process.env.NEXT_PUBLIC_BEHOLD_FEED_ID ?? "";

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
    const thumbUrl =
      (p.thumbnailUrl as string) ??
      sizes?.small?.mediaUrl ??
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
