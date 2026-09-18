/**
 * The Booking page's copy (Sprint 16 Phase 2), from the "Booking Page" field
 * group on WP page 5 ("contact-me"): intro line, the how-booking-works
 * paragraph, the starred "What to include" checklist, three quick facts, and
 * the page's metadata. Every word on /booking outside the form itself.
 *
 * The fact LABELS (Formats / Based / Plays) are the page's fixed row headings,
 * as on /epk; Meg writes the values. An emptied value drops its row.
 */

import acf from "@/generated/wp-content/booking.json";
import { layoutFor, type LayoutItem } from "@/lib/page-layout";

export interface BookingFact {
  label: string;
  value: string;
}

export interface BookingContent {
  lede: string;
  intro: string;
  includeItems: string[];
  facts: BookingFact[];
  metaTitle: string;
  metaDescription: string;
}

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const rows = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? (v as Record<string, unknown>[]) : [];

const FACT_ROWS: ReadonlyArray<readonly [label: string, field: string]> = [
  ["Formats", "fact_formats"],
  ["Based", "fact_based"],
  ["Plays", "fact_plays"],
];

export function parseBooking(raw: unknown): BookingContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    lede: text(r.page_lede),
    intro: text(r.intro),
    includeItems: rows(r.include_items)
      .map((row) => text(row.item))
      .filter(Boolean),
    facts: FACT_ROWS.map(([label, field]) => ({ label, value: text(r[field]) })).filter((f) => f.value),
    metaTitle: text(r.meta_title),
    metaDescription: text(r.meta_description),
  };
}

export const BOOKING_CONTENT: BookingContent = parseBooking(acf);
/** Sprint 17: section order and blocks. */
export const BOOKING_LAYOUT: LayoutItem[] = layoutFor("booking", (acf as Record<string, unknown>).layout_booking);
