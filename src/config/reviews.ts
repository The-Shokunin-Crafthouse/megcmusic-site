/**
 * Curated press per release — 1–2 picked from Meg's WP review pages, kept short
 * and attributed. Levi-editable. `href` links to the fuller review page when one
 * exists. Accolades are chart/list placements; quotes are pulled review lines.
 */
import { WP_ORIGIN } from "@/lib/wp-origin";

export interface Review {
  /** Reviewer / outlet, used as the attribution line. */
  source: string;
  /** A short pulled line from the review. */
  quote?: string;
  /** A chart or list placement (shown as a badge-free accolade). */
  accolade?: string;
  /** Optional link to the full review / roundup. */
  href?: string;
}

export const REVIEWS: Record<string, Review[]> = {
  "shadows-of-a-ghost-town": [
    {
      source: "The Alternate Root",
      accolade: "Top 10 — October 2025",
      href: `${WP_ORIGIN}/reviews-shadows-of-a-ghost-town/`,
    },
    {
      source: "Acoustic Music Seen",
      accolade: "#41 · Top 50 Albums of September 2025",
      href: `${WP_ORIGIN}/reviews-shadows-of-a-ghost-town/`,
    },
  ],
  "kindred-spirits": [
    {
      source: "Joshua D’Estrada · K4CO Radio",
      quote:
        "Strikingly bright and vivid — a true example of beautiful country music.",
      href: `${WP_ORIGIN}/kindred-spirits-review/`,
    },
  ],
};

export function getReviews(slug: string): Review[] {
  return REVIEWS[slug] ?? [];
}
