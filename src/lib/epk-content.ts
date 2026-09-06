/**
 * Electronic Press Kit content, read at build time from the WordPress page Meg
 * edits (Sprint 11 Phase 3 — supersedes src/config/epk.ts and src/config/press.ts).
 *
 * Reads the ACF fields on WP page 608 ("Press Kit") over REST. The build runs on
 * the GitHub Actions runner (deploy.yml), which reaches admin.megcmusic.com; any
 * fetch failure THROWS and fails the build with a named cause — the previous
 * deploy stays live. A field WordPress explicitly returns empty renders as
 * "section absent by content" (empty string / dropped row), never as a fetch
 * failure rendered blank.
 *
 * Two surfaces read this: /epk and the Electronic Press Kit rows on the home
 * page. The module-level memo keeps one build seeing one snapshot.
 */

import { WP_API } from "@/lib/api/wordpress";

/** The WP page Meg edits for the press kit. */
export const EPK_PAGE_ID = 608;

export interface EpkKitItem {
  title: string;
  description: string;
  action: "Download" | "View";
  /** null while the row has neither a file nor a link — renders "Coming soon". */
  href: string | null;
}

export interface EpkPressItem {
  outlet: string;
  title: string;
  href: string;
}

export interface EpkFact {
  label: string;
  value: string;
}

export interface EpkContent {
  pageLede: string;
  facts: readonly EpkFact[];
  kitItems: readonly EpkKitItem[];
  pressItems: readonly EpkPressItem[];
  setListIntro: string;
  resourcesNote: string;
  metaTitle: string;
  metaDescription: string;
}

interface AcfRepeaterRow {
  [key: string]: unknown;
}

const rows = (v: unknown): AcfRepeaterRow[] => (Array.isArray(v) ? v : []);
const text = (v: unknown): string => (typeof v === "string" ? v : "");

/** ACF file fields return `false` when empty and an object (return_format
 *  "array") when set; only the URL matters here. */
function fileUrl(v: unknown): string {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return text((v as Record<string, unknown>).url);
  }
  return "";
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
    `EPK build failed: could not read ACF fields for WP page ${pageId} (${String(lastError)}). ` +
      "The previous deploy stays live; check admin.megcmusic.com and re-run the build.",
  );
}

/** Fact rows in the order the page has always shown them; an emptied field
 *  drops its row rather than rendering a blank definition. */
function facts(acf: Record<string, unknown>): EpkFact[] {
  return [
    { label: "Based", value: text(acf.fact_based) },
    { label: "Sound", value: text(acf.fact_sound) },
    { label: "Formats", value: text(acf.fact_formats) },
    { label: "Played", value: text(acf.fact_played) },
  ].filter((f) => f.value);
}

function kitItems(acf: Record<string, unknown>): EpkKitItem[] {
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

function pressItems(acf: Record<string, unknown>): EpkPressItem[] {
  return rows(acf.press_items)
    .map((r) => ({
      outlet: text(r.outlet),
      title: text(r.title),
      href: text(r.url),
    }))
    .filter((p) => p.href);
}

let cached: Promise<EpkContent> | undefined;

async function load(): Promise<EpkContent> {
  const acf = await fetchAcf(EPK_PAGE_ID);
  return {
    pageLede: text(acf.page_lede),
    facts: facts(acf),
    kitItems: kitItems(acf),
    pressItems: pressItems(acf),
    setListIntro: text(acf.set_list_intro),
    resourcesNote: text(acf.resources_note),
    metaTitle: text(acf.meta_title),
    metaDescription: text(acf.meta_description),
  };
}

export function getEpkContent(): Promise<EpkContent> {
  cached ??= load();
  return cached;
}
