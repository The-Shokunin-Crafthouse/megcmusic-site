/**
 * Release ROUTES — the one part of the registry that stays in code.
 *
 * Everything else about a release (title, year, kind, its WP page, its shop
 * item, streaming links) now comes from the `releases` list on Meg's Music page,
 * read at build by src/lib/releases-content.ts.
 *
 * The route slug cannot: `/music/songs-from-the-sofa` is served from the WP page
 * `songs-from-the-sofa-2` (the maintained page took a suffixed slug when the old
 * duplicate was retired — decisions.md 2026-07-13). Deriving the route from the
 * page slug would change a live URL, which the sprint contract forbids. So the
 * mapping lives here, joined to the WP rows on `wpSlug`.
 *
 * A release with no row here simply has no detail page — it still appears in the
 * discography, exactly as "Everything You Are To Me" does today.
 */
interface ReleaseRoute {
  /** Route slug: /music/<slug>. */
  slug: string;
  /** The WP page the release's row points at. */
  wpSlug: string;
}

export const RELEASE_ROUTES: ReleaseRoute[] = [
  { slug: "shadows-of-a-ghost-town", wpSlug: "shadows-of-a-ghost-town" },
  { slug: "kindred-spirits", wpSlug: "kindred-spirits" },
  { slug: "songs-from-the-sofa", wpSlug: "songs-from-the-sofa-2" },
  { slug: "breaker-breaker", wpSlug: "breaker-breaker" },
  { slug: "aint-going-back", wpSlug: "aint-going-back" },
];
