/**
 * The "Page Basics" field group (Sprint 16 Phase 2): intro line + browser-tab
 * title + search description, on the Shows page (WP 20) and the Shop page
 * (WP 1847). Written into WordPress by the 2026-09-05 migration and never read
 * until now; the strings the pages hardcoded are the parity oracle
 * (src/lib/dead-fields-oracle.test.ts).
 *
 * Pure parse, so it is unit-tested directly; the constants below apply it to
 * the build-time snapshots from scripts/fetch-wp-content.mjs.
 */

import shows from "@/generated/wp-content/shows.json";
import shop from "@/generated/wp-content/shop.json";

export interface PageBasics {
  lede: string;
  metaTitle: string;
  metaDescription: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

export function parsePageBasics(raw: unknown): PageBasics {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    lede: text(r.page_lede),
    metaTitle: text(r.meta_title),
    metaDescription: text(r.meta_description),
  };
}

export const SHOWS_PAGE: PageBasics = parsePageBasics(shows);
export const SHOP_PAGE: PageBasics = parsePageBasics(shop);
