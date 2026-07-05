/**
 * Press — "What Are People Saying?" (from her live /press-kit page). Levi-editable
 * config, seeded from the real outbound links on the WP page so a promoter sees
 * genuine coverage. Add an item and it appears; drop one and it's gone. Outlet is
 * the source name; quote is optional pull copy (kept short, real, no invention).
 */
export interface PressItem {
  outlet: string;
  title: string;
  href: string;
  /** Short pulled line, or null to show the outlet + title only. */
  quote: string | null;
}

export const PRESS_ITEMS: PressItem[] = [
  {
    outlet: "Canvas Rebel",
    title: "Meet Meghan Clarisse Cave",
    href: "https://canvasrebel.com/meet-meghan-clarisse-cave/",
    quote: null,
  },
  {
    outlet: "Denver Entertainment Hub",
    title: "Album Review — Songs From the Sofa",
    href: "https://denverentertainmenthub.com/2023/05/26/album-ep-review-songs-from-the-sofa-meghan-clarisse/",
    quote: null,
  },
  {
    outlet: "Instagram",
    title: "Song Review — Monster",
    href: "https://www.instagram.com/p/CpuduK9MiHu/",
    quote: null,
  },
  {
    outlet: "megcmusic.com",
    title: "Reviews — Shadows of a Ghost Town",
    href: "https://www.megcmusic.com/reviews-shadows-of-a-ghost-town/",
    quote: null,
  },
];
