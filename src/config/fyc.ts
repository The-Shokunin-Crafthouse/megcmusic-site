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

export const FYC_CAMPAIGNS: Record<string, FycCampaign> = {
  /*
   * TODO(Levi) — content drop-in from admin.megcmusic.com/shadows-of-a-ghost-town.
   * This session's network egress could not reach the WP subdomain, so every
   * field below marked "from the WP page" is intentionally empty rather than
   * invented (the page renders each section only once its content exists):
   *   - cycle + category: verbatim from the WP page's FYC framing.
   *   - about: the full album description paragraphs.
   *   - quotes: the three press quotes — Americana Highways, Jack Mesenbourg,
   *     Fervor Coulee — verbatim with attribution.
   *   - videos: the six live-performance YouTube ids + titles.
   *   - lyricSheets: the eleven lyric images, downloaded into
   *     public/images/fyc/ (real intrinsic width/height per image).
   */
  "shadows-of-a-ghost-town": {
    slug: "shadows-of-a-ghost-town",
    album: "Shadows of a Ghost Town",
    artist: "Meghan Clarisse",
    category: "", // from the WP page — see TODO above
    cycle: "", // from the WP page — see TODO above
    status: "live",
    releaseMeta: "Americana · Released September 26, 2025",
    about: [], // from the WP page — see TODO above
    quotes: [], // from the WP page — see TODO above
    videos: [], // from the WP page — see TODO above
    lyricSheets: [], // from the WP page — see TODO above
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
