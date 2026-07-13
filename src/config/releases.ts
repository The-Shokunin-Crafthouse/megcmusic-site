/**
 * Release detail pages (/music/[slug]). Each release's deep content — the
 * description, credits, and lyric sheets — is pulled LIVE from its WordPress
 * page (residential-IP fallback, since the datacenter build can't read WP), so
 * Meg keeps editing in WP. This registry only holds the routing + the streaming
 * links; `wpSlug` is the WP page the prose and images come from.
 *
 * `Everything You Are To Me` (2026) has no WP page yet, so it has no detail
 * page — its discography row stays unlinked until one exists.
 */
export interface ReleaseDetail {
  /** Route slug: /music/<slug>. */
  slug: string;
  title: string;
  year: string;
  type: "SINGLE" | "EP" | "LP";
  /** WP page holding the description + credits + lyric images. */
  wpSlug: string;
  /** Shop product for the cover fallback + native buy link. */
  productSlug?: string;
  /** Per-release streaming overrides; fall back to the artist profiles. */
  spotify?: string;
  apple?: string;
}

export const RELEASE_DETAILS: ReleaseDetail[] = [
  {
    slug: "shadows-of-a-ghost-town",
    title: "Shadows of a Ghost Town",
    year: "2025",
    type: "LP",
    wpSlug: "shadows-of-a-ghost-town",
    productSlug: "shadows-of-a-ghost-town-cd",
  },
  {
    slug: "kindred-spirits",
    title: "Kindred Spirits",
    year: "2024",
    type: "EP",
    wpSlug: "kindred-spirits",
    productSlug: "kindred-spirits-ep",
  },
  {
    slug: "songs-from-the-sofa",
    title: "Songs from the Sofa",
    year: "2023",
    type: "EP",
    wpSlug: "songs-from-the-sofa-2",
    productSlug: "songs-from-the-sofa-cd",
  },
  {
    slug: "breaker-breaker",
    title: "Breaker Breaker",
    year: "2023",
    type: "SINGLE",
    wpSlug: "breaker-breaker",
  },
  {
    slug: "aint-going-back",
    title: "Ain't Going Back",
    year: "2024",
    type: "SINGLE",
    wpSlug: "aint-going-back",
  },
];

export function getReleaseDetail(slug: string): ReleaseDetail | undefined {
  return RELEASE_DETAILS.find((r) => r.slug === slug);
}

/** The two singles — surfaced as their own list on /music (not in the album
 *  discography). Albums link from the shared Discography via `detailSlug`. */
export const SINGLE_SLUGS = ["breaker-breaker", "aint-going-back"] as const;
