/**
 * THE registry of every route's reorderable sections (Sprint 17). Single
 * source for three things that must agree: the "Page layout" field group
 * WordPress shows Meg (generated from this file by
 * scripts/wp-plugin/build-layout-groups.ts — `npm run layout:check` fails CI
 * when the JSON drifts), the layout reader (page-layout.ts), and each page's
 * render map (src/app/**\/page.tsx), which must name every id listed here.
 *
 * A section's id is stable; its label and help text are what Meg reads in
 * her dashboard. Hero, page header, chrome and footer are never sections.
 */

export interface LayoutSection {
  /** Stable id — the render map's key and the ACF layout name suffix. */
  id: string;
  /** What Meg sees in the list. */
  label: string;
  /** One line under it. */
  help: string;
  /**
   * Where the section's content is kept, when some of it is also shown on
   * another page or kept on another page (ADR 2026-09-23). The plugin puts an
   * editor for `fields` on every page that lists them and saves each one back
   * to `pageId`, so there is one copy; `page` and `screen` become a link to
   * where that content is edited. Omit when the section reads only this
   * page's own fields and no other page shows them.
   */
  source?: SectionSource[];
}

export type SectionSource =
  /** Field names on page `pageId` (checked against the plugin's field groups at build). */
  | { kind: "fields"; pageId: number; fields: string[] }
  /** Another page's own text, edited in that page's editor. */
  | { kind: "page"; pageId: number; what: string }
  /** A wp-admin screen (relative to /wp-admin/) that is not a page, e.g. Events. */
  | { kind: "screen"; screen: string; what: string };

// Sources named more than once below. One constant per shared set, so every
// section that shows it names the same fields (the build fails otherwise).
const BIO: SectionSource = {
  kind: "fields",
  pageId: 4,
  fields: ["bio_paragraph_1", "bio_paragraph_2", "bio_paragraph_3", "pull_quote", "pull_quote_attribution"],
};
// Discography falls back to the artist profiles when a release has no link of its own.
const RELEASES: SectionSource = {
  kind: "fields",
  pageId: 5562,
  fields: ["releases", "artist_spotify", "artist_apple", "artist_amazon"],
};
const PRESS_KIT: SectionSource = { kind: "fields", pageId: 608, fields: ["kit_items"] };
const VIDEOS: SectionSource = { kind: "fields", pageId: 5560, fields: ["featured_video_url", "video_list"] };

export interface RouteLayout {
  /** Field name in WordPress: `layout_<route>`. */
  route: string;
  /** Field-group title in the dashboard. */
  title: string;
  /** WordPress page ids that carry this route's field. */
  pageIds: number[];
  sections: LayoutSection[];
}

export const PAGE_LAYOUTS: readonly RouteLayout[] = [
  {
    route: "home",
    title: "Page layout — Home",
    pageIds: [4],
    sections: [
      { id: "liner-notes", label: "Liner Notes", help: "Your bio, the pull quote and the Recognition list.", source: [BIO] },
      { id: "instagram", label: "Instastar", help: "Your latest Instagram posts." },
      { id: "whats-new", label: "What's New", help: "The Blocks you add on this page's Blocks tab." },
      { id: "press-kit", label: "Electronic Press Kit", help: "The press-kit teaser with the boot.", source: [PRESS_KIT] },
      { id: "videos", label: "Latest Videos", help: "The featured video and the playlist.", source: [VIDEOS] },
      { id: "mailing-list", label: "The Mailing List", help: "The sign-up form." },
      { id: "discography", label: "Discography", help: "Albums and EPs from your release list.", source: [RELEASES] },
      { id: "singles", label: "Singles", help: "Singles from your release list.", source: [RELEASES] },
    ],
  },
  {
    route: "music",
    title: "Page layout — Music",
    pageIds: [5562],
    sections: [
      { id: "liner-notes", label: "Liner Notes", help: "Full sentences you write in the page text above, if any." },
      { id: "discography", label: "Discography", help: "Albums and EPs from your release list.", source: [RELEASES] },
      { id: "singles", label: "Singles", help: "Singles from your release list.", source: [RELEASES] },
      { id: "press-kit", label: "Electronic Press Kit", help: "The press-kit teaser with the boot.", source: [PRESS_KIT] },
      {
        id: "work-with-me",
        label: "Work With Me",
        help: "The groups from your Collabs page.",
        source: [{ kind: "fields", pageId: 3742, fields: ["collab_groups", "cave_crew_url"] }],
      },
    ],
  },
  {
    route: "release",
    title: "Page layout — this release's page",
    pageIds: [4350, 4378, 4395, 4403, 4411],
    sections: [
      { id: "record", label: "About the Record + Liner Notes & Lyrics", help: "This page's text and lyric images." },
      { id: "press", label: "What People Are Saying", help: "The quotes and accolades list on this page." },
    ],
  },
  {
    route: "epk",
    title: "Page layout — EPK",
    pageIds: [608],
    sections: [
      { id: "story", label: "The Story", help: "Your bio, the pull quote and the quick facts.", source: [BIO] },
      { id: "kit", label: "Press Kit", help: "The downloads.", source: [PRESS_KIT] },
      { id: "press", label: "What People Are Saying", help: "Press coverage links." },
      { id: "discography", label: "Discography", help: "Albums and EPs from your release list.", source: [RELEASES] },
      {
        id: "set-list",
        label: "Sample Set List",
        help: "From your Sample Set List page.",
        source: [{ kind: "page", pageId: 3666, what: "the songs in the set list" }],
      },
      { id: "resources", label: "Photos & Booking", help: "The closing note and its three buttons." },
    ],
  },
  {
    route: "media",
    title: "Page layout — Media",
    pageIds: [10],
    sections: [
      { id: "watch", label: "Watch", help: "The videos from your Media — Videos page.", source: [VIDEOS] },
      {
        id: "photos",
        label: "Photos",
        help: "The gallery from your Photos page.",
        source: [{ kind: "page", pageId: 5520, what: "the photos in the gallery" }],
      },
    ],
  },
  {
    route: "booking",
    title: "Page layout — Booking",
    pageIds: [5],
    sections: [{ id: "booking", label: "Booking", help: "The intro, checklist, quick facts and the enquiry form." }],
  },
  {
    route: "shows",
    title: "Page layout — Shows",
    pageIds: [20],
    sections: [
      {
        id: "shows",
        label: "Shows",
        help: "The show calendar with its three tabs.",
        source: [{ kind: "screen", screen: "edit.php?post_type=tribe_events", what: "your shows (Events)" }],
      },
    ],
  },
  {
    route: "shop",
    title: "Page layout — Shop",
    pageIds: [1847],
    sections: [
      {
        id: "catalog",
        label: "Products",
        help: "Everything in your WooCommerce store.",
        source: [{ kind: "screen", screen: "edit.php?post_type=product", what: "your products" }],
      },
    ],
  },
  {
    route: "poetry",
    title: "Page layout — Poetry",
    pageIds: [6326],
    sections: [{ id: "about", label: "Inside the Pages", help: "The paragraphs about the book and the Buy button." }],
  },
  {
    route: "fyc",
    title: "Page layout — FYC campaign",
    pageIds: [4350, 4566],
    sections: [
      { id: "press", label: "What People Are Saying", help: "Your press quotes." },
      { id: "about", label: "About the Album", help: "The pitch paragraphs." },
      { id: "watch", label: "Watch Live", help: "The videos." },
      { id: "lyrics", label: "The Lyrics", help: "The lyric sheets." },
      { id: "listen", label: "Listen", help: "Apple Music, Spotify, Amazon." },
      { id: "more", label: "More", help: "The album, press kit and contact links." },
    ],
  },
];

export function routeLayout(route: string): RouteLayout {
  const found = PAGE_LAYOUTS.find((r) => r.route === route);
  if (!found) throw new Error(`page-layouts: no route "${route}"`);
  return found;
}

export const sectionIds = (route: string): string[] => routeLayout(route).sections.map((s) => s.id);
