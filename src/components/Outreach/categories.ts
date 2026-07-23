/**
 * Short category labels for the compact chips on prospect rows and needs-reply
 * cards. The templates carry the full label ("Bars, breweries & taprooms");
 * these are the trimmed versions that fit a chip. Falls back to the raw slug
 * for any unrecognized value.
 */

import { isCategory, type Category } from "@/lib/outreach/types";

const CATEGORY_SHORT: Record<Category, string> = {
  bars: "Bars & taprooms",
  corporate: "Corporate",
  private: "Private & weddings",
  venues: "Listening rooms",
  agents: "Agents",
  cafes: "Cafés & wineries",
};

export function categoryChip(slug: string): string {
  return isCategory(slug) ? CATEGORY_SHORT[slug] : slug;
}
