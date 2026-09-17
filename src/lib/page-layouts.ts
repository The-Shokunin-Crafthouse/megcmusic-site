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
}

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
      { id: "liner-notes", label: "Liner Notes", help: "Your bio, the pull quote and the Recognition list." },
      { id: "instagram", label: "Instastar", help: "Your latest Instagram posts." },
      { id: "whats-new", label: "What's New", help: "The Blocks you add on this page's Blocks tab." },
      { id: "press-kit", label: "Electronic Press Kit", help: "The press-kit teaser with the boot." },
      { id: "videos", label: "Latest Videos", help: "The featured video and the playlist." },
      { id: "mailing-list", label: "The Mailing List", help: "The sign-up form." },
      { id: "discography", label: "Discography", help: "Albums and EPs from your release list." },
      { id: "singles", label: "Singles", help: "Singles from your release list." },
    ],
  },
  {
    route: "music",
    title: "Page layout — Music",
    pageIds: [5562],
    sections: [
      { id: "liner-notes", label: "Liner Notes", help: "Full sentences you write in the page text above, if any." },
      { id: "discography", label: "Discography", help: "Albums and EPs from your release list." },
      { id: "singles", label: "Singles", help: "Singles from your release list." },
      { id: "live-formats", label: "Live Formats", help: "The Solo Acoustic and Full Band cards." },
      { id: "work-with-me", label: "Work With Me", help: "The groups from your Collabs page." },
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
      { id: "story", label: "The Story", help: "Your bio, the pull quote and the quick facts." },
      { id: "kit", label: "Press Kit", help: "The downloads." },
      { id: "press", label: "What People Are Saying", help: "Press coverage links." },
      { id: "discography", label: "Discography", help: "Albums and EPs from your release list." },
      { id: "set-list", label: "Sample Set List", help: "From your Sample Set List page." },
      { id: "resources", label: "Photos & Booking", help: "The closing note and its three buttons." },
    ],
  },
  {
    route: "media",
    title: "Page layout — Media",
    pageIds: [10],
    sections: [
      { id: "watch", label: "Watch", help: "The videos from your Media — Videos page." },
      { id: "photos", label: "Photos", help: "The gallery from your Photos page." },
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
    sections: [{ id: "shows", label: "Shows", help: "The show calendar with its three tabs." }],
  },
  {
    route: "shop",
    title: "Page layout — Shop",
    pageIds: [1847],
    sections: [{ id: "catalog", label: "Products", help: "Everything in your WooCommerce store." }],
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
