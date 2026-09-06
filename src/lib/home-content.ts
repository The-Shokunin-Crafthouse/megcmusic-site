/**
 * Home-page content, read at build time from the WordPress page Meg edits
 * (Sprint 11 Phase 3 — supersedes src/config/bio.ts, src/config/recognition.ts,
 * and the copy hardcoded in LinerNotes, Instagram and Newsletter).
 *
 * Values come from the ACF fields on WP page 4 ("Home Page"), fetched by
 * scripts/fetch-wp-content.mjs into src/generated/wp-content/home.json and
 * statically imported here. See src/lib/epk-content.ts for why the read is a
 * prebuild step rather than a fetch inside the page.
 *
 * This is the CANONICAL home for the bio and the pull quote: /epk's "The Story"
 * renders the same three paragraphs and the same quote, so Meg writes them once.
 *
 * The site background photo (`hero_photo`) is deliberately NOT read here — it
 * is a separate change with its own parity question, tracked apart from this
 * copy migration.
 */

import acf from "@/generated/wp-content/home.json";

interface RecognitionEntry {
  /** Year or span, e.g. "2026" or "2019 – Present". */
  period: string;
  title: string;
  detail: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

/** The three bio paragraphs, in order. An emptied one drops out rather than
 *  rendering a blank paragraph — and the drop cap follows whichever is first. */
const bioParagraphs: string[] = [
  text(acf.bio_paragraph_1),
  text(acf.bio_paragraph_2),
  text(acf.bio_paragraph_3),
].filter(Boolean);

const recognition: RecognitionEntry[] = rows(acf.recognition)
  .map((r) => ({
    period: text(r.years),
    title: text(r.honor),
    detail: text(r.detail),
  }))
  .filter((r) => r.title);

export const HOME_CONTENT = {
  bioParagraphs,
  pullQuote: text(acf.pull_quote),
  pullQuoteAttribution: text(acf.pull_quote_attribution),
  recognition,
  instagramCaption: text(acf.instagram_caption),
  instagramHandle: text(acf.instagram_handle),
  instagramUrl: text(acf.instagram_url),
  facebookUrl: text(acf.facebook_url),
  youtubeUrl: text(acf.youtube_url),
  newsletterHeadline: text(acf.newsletter_headline),
  newsletterBlurb: text(acf.newsletter_blurb),
  newsletterBirthdayNote: text(acf.newsletter_birthday_note),
  metaTitle: text(acf.meta_title),
  metaDescription: text(acf.meta_description),
} as const;
