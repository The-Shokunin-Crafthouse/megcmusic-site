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
import { RELEASE_ROUTES, type ReleaseRoute } from "@/config/releases";
import { WP_ORIGIN } from "@/lib/wp-origin";
import { paragraphsFromHtml } from "@/lib/wp-content";
import { parseReviews, type Review } from "@/lib/release-reviews";
import { layoutFor, type LayoutItem } from "@/lib/page-layout";
import { parsePressPage, type PressBlock } from "@/lib/press-page";

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

/**
 * A release's detail route. Derived from the WP page Meg points the row at, so
 * giving a release a detail page is something she does in her dashboard rather
 * than something that waits on a deploy. RELEASE_ROUTES overrides the derived
 * slug for the one release whose public URL no longer matches its page slug.
 */
const routeFor = (row: Row): ReleaseRoute | undefined => {
  if (!row.pageSlug) return undefined;
  return (
    RELEASE_ROUTES.find((r) => r.wpSlug === row.pageSlug) ?? {
      slug: row.pageSlug,
      wpSlug: row.pageSlug,
    }
  );
};

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
 * Optional intro prose from the WP Music page's own body, shown as "Liner
 * Notes" above the discography. That body is structurally a release gallery —
 * nearly every <p> is empty, a bare cover link, or a <strong> heading — so
 * only real sentences (six-plus words) count. Read at build (Sprint 16 Phase
 * 2): the request-time read it replaces could never succeed on production,
 * whose runtime cannot reach WordPress, so this prose never rendered.
 */
export const MUSIC_INTRO: string[] = paragraphsFromHtml(data.introHtml ?? "").filter(
  (para) => para.split(/\s+/).length >= 6,
);

/** Sprint 17: the Music page's section order and blocks. */
export const MUSIC_LAYOUT: LayoutItem[] = layoutFor("music", (data as Record<string, unknown>).layoutMusic);

/** Sprint 17: a release page's section order and blocks, by ROUTE slug. */
export function getReleaseLayout(slug: string): LayoutItem[] {
  const row = data.releases.find((r) => routeFor(r)?.slug === slug);
  return layoutFor("release", (row as Record<string, unknown> | undefined)?.layout);
}

/** Press for a release by its ROUTE slug — the "Release Reviews" repeater on
 *  that release's WP page (Sprint 16 Phase 2; supersedes src/config/reviews.ts). */
export function getReviews(slug: string): Review[] {
  const row = data.releases.find((r) => routeFor(r)?.slug === slug);
  const absorbed = new Set(pressPagesOf(row).map((p) => p.slug));
  return parseReviews(row?.reviews).map((review) => {
    const own = review.href ? ownPageSlug(review.href) : null;
    return own && absorbed.has(own) ? { ...review, href: reviewsRoute(slug) } : review;
  });
}

export interface PressPage {
  slug: string;
  title: string;
  blocks: PressBlock[];
}

type RawPressPage = { id: number; slug: string; title: string; html: string };
const pressPagesOf = (row: Row | undefined): RawPressPage[] => {
  const raw = (row as unknown as { pressPages?: unknown } | undefined)?.pressPages;
  return Array.isArray(raw) ? (raw as RawPressPage[]) : [];
};

const OWN_HOSTS = new Set(["admin.megcmusic.com", "www.megcmusic.com", "megcmusic.com"]);
function ownPageSlug(link: string): string | null {
  try {
    const u = new URL(link);
    if (!OWN_HOSTS.has(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length === 1 ? parts[0] : null;
  } catch {
    return null;
  }
}

/** The live home of a release's review pages (absorbed 2026-09-17). */
export const reviewsRoute = (slug: string): string => `/music/${slug}/reviews`;

/** Meg's own review pages linked from a release's review rows, by ROUTE slug —
 *  their bodies read at build and rendered at /music/<slug>/reviews. */
export function getPressPages(slug: string): PressPage[] {
  const row = data.releases.find((r) => routeFor(r)?.slug === slug);
  return pressPagesOf(row)
    .map((p) => ({ slug: p.slug, title: p.title, blocks: parsePressPage(p.html) }))
    .filter((p) => p.blocks.length > 0);
}

/** The live route for a link to one of Meg's own pages that a release has
 *  absorbed (2026-09-17), or the link unchanged. Used wherever her fields
 *  carry a URL — release review rows, the EPK's press coverage. */
export function liveHref(href: string): string {
  const own = ownPageSlug(href);
  if (!own) return href;
  for (const row of data.releases) {
    const route = routeFor(row)?.slug;
    if (route && pressPagesOf(row).some((p) => p.slug === own)) return reviewsRoute(route);
  }
  return href;
}

/** Route slugs that have a reviews page. */
export const RELEASES_WITH_PRESS: string[] = data.releases
  .map((r) => routeFor(r)?.slug)
  .filter((slug): slug is string => !!slug && pressPagesOf(data.releases.find((r) => routeFor(r)?.slug === slug)).length > 0);

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
