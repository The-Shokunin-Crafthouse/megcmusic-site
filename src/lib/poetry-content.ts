/**
 * "Secrets From a Songbird" page copy, read at build time from the WordPress
 * page Meg edits (Sprint 11 Phase 3 — supersedes the copy in
 * src/config/poetry.ts).
 *
 * Values come from the ACF fields on the `site-poetry` page ("Site: Poetry"),
 * fetched by scripts/fetch-wp-content.mjs into
 * src/generated/wp-content/poetry.json and statically imported here. That page
 * exists only as Meg's editing surface — visitors see megcmusic.com/poetry.
 *
 * Unlike the EPK and media libs this exports a plain object rather than an
 * async getter: /poetry renders statically and its page component is
 * synchronous, so there is nothing to await.
 *
 * The cover image still resolves from the shop product (src/config/poetry.ts).
 * The buy destination is Meg's to set: `buy_url` wins when she fills it, and
 * falls back to that same shop route — which is where both buttons point today,
 * so the page is unchanged until she changes it. The fallback also covers the
 * window before the 1.1.0 plugin is uploaded, while the field does not yet
 * exist; it can be dropped once the field is populated.
 */

import acf from "@/generated/wp-content/poetry.json";
import { POETRY } from "@/config/poetry";

const text = (v: unknown): string => (typeof v === "string" ? v : "");
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

export const POETRY_CONTENT = {
  title: text(acf.book_title),
  subtitle: text(acf.subtitle),
  lede: text(acf.lede),
  /** "Inside the Pages". An emptied paragraph drops out rather than rendering
   *  a blank block. */
  paragraphs: rows(acf.body_paragraphs)
    .map((r) => text(r.paragraph))
    .filter(Boolean),
  note: text(acf.cta_note),
  buyHref: text((acf as Record<string, unknown>).buy_url) || POETRY.buyHref,
  metaTitle: text(acf.meta_title),
  metaDescription: text(acf.meta_description),
} as const;
