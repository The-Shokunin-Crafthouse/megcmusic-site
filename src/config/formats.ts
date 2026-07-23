/**
 * Live formats — how Meg performs. The photos come from her WP format pages
 * (admin → Pages), resolved client-side (the datacenter build can't read WP),
 * so she swaps a photo by changing the image on that page. Blurbs are written.
 */
export interface LiveFormat {
  /** WP page slug the format photo is pulled from. */
  slug: string;
  label: string;
  blurb: string;
}

export const LIVE_FORMATS: LiveFormat[] = [
  {
    slug: "solo-acoustic",
    label: "Solo Acoustic",
    blurb:
      "Just Meghan and a guitar — listening rooms, house concerts, and weddings.",
  },
  {
    slug: "full-band",
    label: "Full Band",
    blurb:
      "Meghan and her band — festivals, bars, and big rooms across the Front Range.",
  },
];
