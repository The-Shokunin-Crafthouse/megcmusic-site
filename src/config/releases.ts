/**
 * Release route OVERRIDES — the small exception list, not the route table.
 *
 * A release's detail page normally lives at `/music/<its WP page slug>`, derived
 * at build from the `releases` list on Meg's Music page. That matters: it means
 * she can give a release a detail page entirely from her dashboard — create the
 * page, point the row's "Its page on this dashboard" at it — with no code change
 * and no deploy waiting on anyone.
 *
 * One release cannot derive its route. `/music/songs-from-the-sofa` is served
 * from the WP page `songs-from-the-sofa-2` (the maintained page took a suffixed
 * slug when the old duplicate was retired — decisions.md 2026-07-13). Deriving
 * that one would change a live URL. So it lives here, joined on `wpSlug`.
 *
 * Add a row here only to keep an existing public URL that no longer matches its
 * page slug. Everything else derives.
 */
export interface ReleaseRoute {
  /** Route slug: /music/<slug>. */
  slug: string;
  /** The WP page the release's row points at. */
  wpSlug: string;
}

export const RELEASE_ROUTES: ReleaseRoute[] = [
  // The only release whose public URL differs from its WP page slug.
  { slug: "songs-from-the-sofa", wpSlug: "songs-from-the-sofa-2" },
];
