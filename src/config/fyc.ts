/**
 * "For Your Consideration" — awards-campaign pages, one per campaign at
 * /fyc/<slug>. Levi-editable: a future campaign is one entry here plus one
 * page under src/app/fyc/<slug>/ (and a retarget of the /fyc redirect in
 * next.config.ts). Page components consume this config only.
 *
 * The LIVE campaign (status: "live") is on the nav and indexable; archived
 * campaigns stay reachable, noindex, and framed as a record. Contact routes
 * through /epk + /booking rather than a hardcoded email.
 */

export interface FycQuote {
  /** Pulled line, verbatim from the source review — never paraphrased. */
  quote: string;
  /** Reviewer / outlet attribution line. */
  source: string;
}

export interface FycVideo {
  /** YouTube video id. */
  id: string;
  title: string;
}

export interface FycLyricSheet {
  /** Local path under public/ — never hotlink the WP subdomain. */
  src: string;
  alt: string;
  /** Intrinsic pixel size — required so 11 lazy images can't shift layout. */
  width: number;
  height: number;
}

export interface FycCampaign {
  /** Route slug: /fyc/<slug>. */
  slug: string;
  album: string;
  artist: string;
  /** Awards category, verbatim from the campaign source. */
  category: string;
  /** Awards cycle line, verbatim from the campaign source. */
  cycle: string;
  status: "live" | "archived";
  /** Genre / release meta line shown under the cycle (live pages). */
  releaseMeta?: string;
  /** Album description paragraphs. */
  about: readonly string[];
  quotes: readonly FycQuote[];
  /** Live-performance videos (facade thumbnails linking out to YouTube). */
  videos: readonly FycVideo[];
  lyricSheets: readonly FycLyricSheet[];
  /** The album's detail page for the More section. */
  albumHref: string;
}

/** The campaign /fyc redirects to (next.config.ts) and the nav points at. */
export const FYC_CURRENT_SLUG = "shadows-of-a-ghost-town";

/*
 * Shadows content source: admin.megcmusic.com/shadows-of-a-ghost-town
 * (the original WP campaign page), extracted 2026-08-28. Category wording,
 * quotes, and description are verbatim from that page; video titles resolved
 * via YouTube oEmbed. The WP page names no ceremony year — if Meg wants e.g.
 * "69th GRAMMY Awards" on the cycle line, add it here.
 *
 * lyricSheets paths are populated by `node scripts/fetch-fyc-assets.mjs`
 * (runs inside `npm run build` with --skip-if-present; commit the files to
 * public/images/fyc/ someday for durability and the build step no-ops).
 *
 * Track titles below are the album's CD tracklist in order (Discogs release
 * 67607). Sheet order matches the source booklet-page batch (sequential WP
 * uploads following the cover + credits pages) — if a sheet is ever found
 * mislabeled, fix the order of SHADOWS_TRACKS, nothing else.
 */

const SHADOWS_TRACKS = [
  "Bright Lights",
  "Desert Run",
  "Copper and Quartz",
  "Here I Am Again",
  "The Catch That Got Away",
  "The Ballad of Lily Mae",
  "Fire and Fly",
  "Never Going Home",
  "Strong",
  "Ghost of California",
  "Life of the Party",
] as const;

const SHADOWS_LYRIC_SHEETS: readonly FycLyricSheet[] = SHADOWS_TRACKS.map(
  (song, i) => ({
    src: `/images/fyc/lyric-${String(i + 1).padStart(2, "0")}.png`,
    alt: `Lyric sheet for “${song}” — track ${i + 1} of 11 on Shadows of a Ghost Town`,
    width: 1024,
    height: 1024,
  }),
);

export const FYC_CAMPAIGNS: Record<string, FycCampaign> = {
  "shadows-of-a-ghost-town": {
    slug: "shadows-of-a-ghost-town",
    album: "Shadows of a Ghost Town",
    artist: "Meghan Clarisse",
    category: "Contemporary Country Album",
    cycle: "For Your Grammy Consideration · Country & American Roots Music",
    status: "live",
    releaseMeta: "Released September 26, 2025",
    about: [
      "Shadows of a Ghost Town is a deeply personal and poetic exploration of place, memory, and mortality, told through the lens of the American West. Rooted in the traditions of Americana and brushed with shades of country and bluegrass, this album is both a love letter to the land and a reckoning with the ghosts we carry.",
      "Set against the backdrop of wide-open skies, dusty trails, and abandoned towns, each track captures a moment suspended between the living and the lost. There are stories of a quiet ache that follows when something—or someone—disappears. The mountains aren't just scenery here; they're characters. So are the shadows, the silence, and the wind.",
      "With raw instrumentation, vivid storytelling, and melodies that rise like canyon winds and fall like dusk over the plains, Shadows of a Ghost Town weaves together the grit of bluegrass with the soul of country and the heart of folk. These songs don't shy away from sorrow, but they don't dwell in it either. Instead, they honor it. They ride through it. At its core, this album is about transience—how everything we know and love eventually fades, and yet somehow, that makes it all the more beautiful. Whether it's a home, a way of life, or a person you thought you'd never lose, Shadows of a Ghost Town reminds us that some things linger even after they're gone. You can still hear the music if you know where to listen.",
    ],
    quotes: [
      {
        quote:
          "This collection will strike listeners as a personal & poetic exploration that touches upon places, memories & mortality. It focuses on the traditions of the American West with music that would be accomplished most genuinely through Country, & bluegrass blended into the land & celebrating it.",
        source: "John Apice · Americana Highways",
      },
      {
        quote:
          "A very worthy collection of eleven songs that I suspect are going to increase her visibility in the country and bluegrass genre.",
        source: "Jack Mesenbourg",
      },
      {
        quote:
          "Clarisse utilizes 'place' better than most to magnify the emotional heft of her creations. There is sorrow within the deliberately crafted lyrics, but the overarching theme is the impermanence that we must accept as we survive the years: eventually everything fades to memory.",
        source: "Fervor Coulee",
      },
    ],
    videos: [
      { id: "xqS1ZpZF7Fc", title: "Strong — Colorado & Company (with Todd Clayton)" },
      { id: "A8E_XRwkhTk", title: "Copper & Quartz — live at Society Hall" },
      { id: "4kXga9Vwc2g", title: "The Ghost of California — live from Shelton Manor" },
      { id: "oIrtaOZ2Yb8", title: "Life of the Party — Second Sunday Showcase" },
      { id: "hwLbMyR4SLw", title: "Fire and Fly — Society Hall (with Don Richmond)" },
      { id: "WeYjhIiKNiU", title: "Strong — Great Day Colorado" },
    ],
    lyricSheets: SHADOWS_LYRIC_SHEETS,
    albumHref: "/music/shadows-of-a-ghost-town",
  },
  "kindred-spirits": {
    slug: "kindred-spirits",
    album: "Kindred Spirits",
    artist: "Meghan Clarisse",
    category: "Americana Album of the Year",
    cycle: "2024 · The Recording Academy",
    status: "archived",
    about: [
      "Kindred Spirits is Meghan Clarisse's 2024 album — a collection of original co-writes and duets that celebrates connection. It showcases collaborations with songwriters and musicians from across the Mountain West, blending Americana, country, and bluegrass, with every track reflecting themes of connection, storytelling, and resilience.",
    ],
    quotes: [],
    videos: [{ id: "_xxVV1vrRnY", title: "Elastic Love" }],
    lyricSheets: [],
    albumHref: "/music/kindred-spirits",
  },
};

export function getFycCampaign(slug: string): FycCampaign | undefined {
  return FYC_CAMPAIGNS[slug];
}
