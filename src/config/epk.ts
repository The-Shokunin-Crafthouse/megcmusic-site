/**
 * Electronic Press Kit rows (Figma 39:158). Levi-editable config. The Sample
 * Set List points at the live WP page; the Solo Acoustic / Full Band one-sheets
 * aren't in WordPress yet, so they ship as a "coming soon" state (href: null)
 * until the PDFs are added — set the href and they go live.
 */
export interface EpkItem {
  title: string;
  description: string;
  action: "Download" | "View";
  href: string | null;
}

export const EPK_ITEMS: EpkItem[] = [
  {
    title: "Solo Acoustic EPK",
    description: "One-sheet, bio, and stage plot for intimate rooms.",
    action: "Download",
    href: null,
  },
  {
    title: "Full Band EPK",
    description: "Festival-ready one-sheet, input list, and tech rider.",
    action: "Download",
    href: null,
  },
  {
    title: "Sample Set List",
    description: "Crowd pleasers from covers to originals.",
    action: "View",
    href: "https://www.megcmusic.com/sample-set-list/",
  },
];
