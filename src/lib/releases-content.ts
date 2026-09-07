/**
 * The release registry, read at build time from the WordPress page Meg edits
 * (Sprint 11 Phase 3 — supersedes src/config/discography.ts and the release
 * data in src/config/releases.ts).
 *
 * One list on WP page 5562 powers three surfaces: the Discography on Home,
 * Music and Press Kit; the Singles list on Music; and each release's own page.
 * scripts/fetch-releases.mjs reads it at build, resolves ACF's page/product IDs
 * to slugs, and writes src/generated/releases.json.
 *
 * WHICH LIST A RELEASE LANDS IN. Albums and EPs go in the Discography; singles
 * go in the Singles list — exactly what the field's help text in WordPress
 * promises Meg, and what the `kind` she picks now decides on its own.
 *
 * This replaced a subtler rule that also kept singles WITHOUT a detail page in
 * the Discography, which is how "Everything You Are To Me" used to lead it
 * (decisions.md 2026-09-06; Levi's call: it is a single, so it belongs with the
 * singles). A single need not have a detail page to be listed — one without a
 * page renders as a plain row rather than a link.
 */

import data from "@/generated/releases.json";
import { RELEASE_ROUTES } from "@/config/releases";
import { WP_ORIGIN } from "@/lib/wp-origin";

interface Release {
  year: string;
  type: "SINGLE" | "EP" | "LP";
  title: string;
  /** Always null: covers resolve in the browser from the release page's
   *  featured image, then the shop product image. */
  art: string | null;
  pageSlug?: string;
  productSlug?: string;
  /** Route slug of this release's detail page, when it has one. */
  detailSlug?: string;
  spotify?: string;
  apple?: string;
  buy?: string;
}

export interface ReleaseDetail {
  slug: string;
  title: string;
  year: string;
  type: "SINGLE" | "EP" | "LP";
  /** WP page holding the description + credits + lyric images. */
  wpSlug: string;
  productSlug?: string;
  spotify?: string;
  apple?: string;
}

type Row = (typeof data.releases)[number];

const routeFor = (row: Row) =>
  row.pageSlug ? RELEASE_ROUTES.find((r) => r.wpSlug === row.pageSlug) : undefined;

const kindOf = (row: Row): Release["type"] =>
  row.kind === "LP" || row.kind === "EP" ? row.kind : "SINGLE";

/** Meg's artist profiles, used wherever a release has no link of its own.
 *  `buy` is the shop itself, derived from the WP origin rather than a field. */
export const ARTIST_LINKS = {
  spotify: data.artist.spotify,
  apple: data.artist.apple,
  amazon: data.artist.amazon,
  buy: `${WP_ORIGIN}/shop/`,
};

/** The Music page's own copy. */
export const MUSIC_PAGE = {
  lede: data.pageLede,
  metaTitle: data.metaTitle,
  metaDescription: data.metaDescription,
};

/**
 * Newest first, both listings. Before this the order was whatever order Meg's
 * registry rows happened to be in — the albums read newest-first by luck while
 * the singles read 2026, 2023, 2024 beside them. Sort is stable, so two
 * releases sharing a year keep her row order between them.
 */
const newestFirst = <T extends { year: string }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => Number(b.year) - Number(a.year));

/** Albums and EPs — the Discography on Home, Music and Press Kit. */
export const RELEASES: Release[] = newestFirst(
  data.releases.filter((row) => kindOf(row) !== "SINGLE"),
)
  .map((row) => ({
    year: row.year,
    type: kindOf(row),
    title: row.title,
    art: null,
    pageSlug: row.pageSlug ?? undefined,
    productSlug: row.productSlug ?? undefined,
    detailSlug: routeFor(row)?.slug,
    spotify: row.spotifyUrl || undefined,
    apple: row.appleUrl || undefined,
  }));

export const RELEASE_DETAILS: ReleaseDetail[] = data.releases
  .flatMap((row) => {
    const route = routeFor(row);
    if (!route) return [];
    return [
      {
        slug: route.slug,
        title: row.title,
        year: row.year,
        type: kindOf(row),
        wpSlug: route.wpSlug,
        productSlug: row.productSlug ?? undefined,
        spotify: row.spotifyUrl || undefined,
        apple: row.appleUrl || undefined,
      },
    ];
  });

export function getReleaseDetail(slug: string): ReleaseDetail | undefined {
  return RELEASE_DETAILS.find((r) => r.slug === slug);
}

interface Single {
  title: string;
  year: string;
  type: "SINGLE";
  /** Route slug, when the single has a detail page; absent means a plain row. */
  detailSlug?: string;
}

/** Every single, listed on /music — not in the discography. */
export const SINGLES: Single[] = newestFirst(
  data.releases.filter((row) => kindOf(row) === "SINGLE"),
)
  .map((row) => ({
    title: row.title,
    year: row.year,
    type: "SINGLE" as const,
    detailSlug: routeFor(row)?.slug,
  }));
