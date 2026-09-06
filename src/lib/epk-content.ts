/**
 * Electronic Press Kit content, read at build time from the WordPress page Meg
 * edits (Sprint 11 Phase 3 — supersedes src/config/epk.ts and src/config/press.ts).
 *
 * The values come from the ACF fields on WP page 608 ("Press Kit"), fetched by
 * scripts/fetch-wp-content.mjs (first step of `npm run build`) into
 * src/generated/wp-content/epk.json and statically imported here. That fetch
 * runs on the GitHub Actions runner, which reaches admin.megcmusic.com; the
 * Vercel serverless runtime does not, and /epk is a dynamic route — so reading
 * WordPress here per request would throw on every visit. Any failure fails the
 * BUILD with a named cause and the previous deploy stays live.
 *
 * A field WordPress explicitly returns empty renders as "section absent by
 * content" (dropped fact row / dropped entry / empty string) — never a fetch
 * failure rendered blank, because a fetch failure never gets this far.
 *
 * Two surfaces read this: /epk and the Electronic Press Kit rows on the home
 * page, so Meg edits them in one place.
 */

import acf from "@/generated/wp-content/epk.json";

export interface EpkKitItem {
  title: string;
  description: string;
  action: "Download" | "View";
  /** null while the row has neither a file nor a link — renders "Coming soon". */
  href: string | null;
}

interface EpkPressItem {
  outlet: string;
  title: string;
  href: string;
}

interface EpkFact {
  label: string;
  value: string;
}

interface EpkContent {
  pageLede: string;
  facts: readonly EpkFact[];
  kitItems: readonly EpkKitItem[];
  pressItems: readonly EpkPressItem[];
  setListIntro: string;
  resourcesNote: string;
  metaTitle: string;
  metaDescription: string;
}

type AcfRecord = Record<string, unknown>;

const rows = (v: unknown): AcfRecord[] => (Array.isArray(v) ? (v as AcfRecord[]) : []);
const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** ACF file fields return `false` when empty and an object (return_format
 *  "array") when set; only the URL matters here. */
function fileUrl(v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return text((v as AcfRecord).url);
  }
  return "";
}

/** Fact rows in the order the page has always shown them; an emptied field
 *  drops its row rather than rendering a blank definition. */
function facts(acf: AcfRecord): EpkFact[] {
  return [
    { label: "Based", value: text(acf.fact_based) },
    { label: "Sound", value: text(acf.fact_sound) },
    { label: "Formats", value: text(acf.fact_formats) },
    { label: "Played", value: text(acf.fact_played) },
  ].filter((f) => f.value);
}

function kitItems(acf: AcfRecord): EpkKitItem[] {
  return rows(acf.kit_items)
    .map((r) => {
      const file = fileUrl(r.file);
      const link = text(r.link);
      return {
        title: text(r.title),
        description: text(r.description),
        // An uploaded one-sheet is a download; a link points somewhere to read.
        action: (file ? "Download" : "View") as EpkKitItem["action"],
        href: file || link || null,
      };
    })
    .filter((k) => k.title);
}

function pressItems(acf: AcfRecord): EpkPressItem[] {
  return rows(acf.press_items)
    .map((r) => ({
      outlet: text(r.outlet),
      title: text(r.title),
      href: text(r.url),
    }))
    .filter((p) => p.href);
}

const content: EpkContent = {
  pageLede: text(acf.page_lede),
  facts: facts(acf),
  kitItems: kitItems(acf),
  pressItems: pressItems(acf),
  setListIntro: text(acf.set_list_intro),
  resourcesNote: text(acf.resources_note),
  metaTitle: text(acf.meta_title),
  metaDescription: text(acf.meta_description),
};

/** Async so the call sites read the same whether a surface is bundled at build
 *  (today) or fetched per request (a future statically-rendered surface). */
export async function getEpkContent(): Promise<EpkContent> {
  return content;
}
