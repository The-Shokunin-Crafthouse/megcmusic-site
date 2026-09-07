/**
 * FYC campaign content, read at build time from the WordPress pages Meg edits
 * (Sprint 11 — supersedes src/config/fyc.ts, decisions.md 2026-08-29).
 *
 * Reads the ACF fields on the campaign's WP page over REST. The build runs on
 * the GitHub Actions runner (deploy.yml), which reaches admin.megcmusic.com;
 * any fetch failure THROWS and fails the build with a named cause — the
 * previous deploy stays live. A field WordPress explicitly returns empty
 * renders as "section absent by content" (empty array / empty string), which
 * the pages already handle.
 *
 * Lyric-sheet images are local files downloaded by scripts/fetch-fyc-assets.mjs
 * (runs first in `npm run build`), which also writes public/images/fyc/
 * manifest.json — this module reads that manifest rather than hotlinking WP.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { WP_API } from "@/lib/api/wordpress";

interface FycQuote {
  quote: string;
  source: string;
}

interface FycVideo {
  id: string;
  title: string;
}

interface FycLyricSheet {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface FycCampaign {
  slug: string;
  album: string;
  artist: string;
  category: string;
  cycle: string;
  releaseMeta?: string;
  about: readonly string[];
  quotes: readonly FycQuote[];
  videos: readonly FycVideo[];
  lyricSheets: readonly FycLyricSheet[];
  albumHref: string;
}

/** Campaign route slug → the WP page Meg edits. Adding a campaign = a WP page
 *  with the FYC field group + a row here + a page directory (studio task). */
const FYC_PAGE_IDS: Record<string, number> = {
  "shadows-of-a-ghost-town": 4350,
  "kindred-spirits": 4566,
};

const ARTIST = "Meghan Clarisse";

/** youtube.com/watch?v=…, youtu.be/…, or bare id → video id. */
function youtubeId(url: string): string {
  const m =
    url.match(/[?&]v=([\w-]{6,})/) ??
    url.match(/youtu\.be\/([\w-]{6,})/) ??
    url.match(/^([\w-]{6,})$/);
  return m?.[1] ?? "";
}

/** Absolute megcmusic.com URLs become site-relative hrefs; relative pass through. */
function siteHref(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search + u.hash;
  } catch {
    return url;
  }
}

function readLyricManifest(pageId: number): FycLyricSheet[] {
  const manifestPath = path.join(process.cwd(), "public", "images", "fyc", "manifest.json");
  let raw: string;
  try {
    raw = readFileSync(manifestPath, "utf8");
  } catch {
    throw new Error(
      "FYC build failed: public/images/fyc/manifest.json missing — scripts/fetch-fyc-assets.mjs must run before the build (it does in `npm run build`).",
    );
  }
  const manifest = JSON.parse(raw) as Record<string, FycLyricSheet[]>;
  const sheets = manifest[String(pageId)];
  if (!sheets) {
    throw new Error(
      `FYC build failed: manifest.json has no entry for WP page ${pageId} — re-run scripts/fetch-fyc-assets.mjs.`,
    );
  }
  return sheets;
}

interface AcfRepeaterRow {
  [key: string]: unknown;
}

async function fetchAcf(pageId: number): Promise<Record<string, unknown>> {
  const url = `${WP_API}/pages/${pageId}?acf_format=standard&_fields=acf`;
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { acf?: Record<string, unknown> };
      if (!json.acf || typeof json.acf !== "object") {
        throw new Error("response has no acf object — is the megc-site-content plugin active?");
      }
      return json.acf;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(
    `FYC build failed: could not read ACF fields for WP page ${pageId} (${String(lastError)}). ` +
      "The previous deploy stays live; check admin.megcmusic.com and re-run the build.",
  );
}

const rows = (v: unknown): AcfRepeaterRow[] => (Array.isArray(v) ? v : []);
const text = (v: unknown): string => (typeof v === "string" ? v : "");

export async function getFycCampaign(slug: string): Promise<FycCampaign> {
  const pageId = FYC_PAGE_IDS[slug];
  if (!pageId) throw new Error(`Unknown FYC campaign slug: ${slug}`);
  const acf = await fetchAcf(pageId);

  return {
    slug,
    album: text(acf.album_title),
    artist: ARTIST,
    category: text(acf.category_line),
    cycle: text(acf.cycle_line),
    releaseMeta: text(acf.release_meta) || undefined,
    about: rows(acf.pitch_paragraphs)
      .map((r) => text(r.paragraph))
      .filter(Boolean),
    quotes: rows(acf.quotes)
      .map((r) => {
        const source = text(r.source);
        const detail = text(r.source_detail);
        return {
          quote: text(r.quote),
          source: detail ? `${source} · ${detail}` : source,
        };
      })
      .filter((q) => q.quote),
    videos: rows(acf.videos)
      .map((r) => ({ id: youtubeId(text(r.youtube_url)), title: text(r.title) }))
      .filter((v) => v.id),
    lyricSheets: readLyricManifest(pageId),
    albumHref: siteHref(text(acf.album_link)) || "/music",
  };
}
