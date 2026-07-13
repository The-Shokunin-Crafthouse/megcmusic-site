/**
 * Discography (Figma 128:673). Levi-editable config. Streaming buttons point at
 * Meg's artist-level profiles for now — per-release deep links are a later swap
 * (just add `spotify`/`apple` to a release to override). `art` is null until a
 * cover is dropped in; the row shows a titled placeholder meanwhile.
 */
import { WP_ORIGIN } from "@/lib/wp-origin";

export interface Release {
  year: string;
  type: "SINGLE" | "EP" | "LP";
  title: string;
  /**
   * Cover art. `null` means "resolve it live from WordPress" — the row shows a
   * titled placeholder, then swaps in the real cover the browser fetches from
   * Meg's residential-reachable WP (the datacenter build can't read WP). Source
   * order: the release page's Featured Image, then the Shop product image.
   * Set a string here only to hard-pin a local/CDN cover and skip the WP fetch.
   */
  art: string | null;
  /** WP page whose Featured Image is the preferred cover (admin → Pages). */
  pageSlug?: string;
  /** Shop product whose image is the cover fallback (admin → Products). */
  productSlug?: string;
  /** Route slug of this release's detail page (/music/<detailSlug>), if it has
   *  one — the row links there. See config/releases.ts. */
  detailSlug?: string;
  /** Per-release overrides; fall back to the artist profiles below. */
  spotify?: string;
  apple?: string;
  buy?: string;
}

export const ARTIST_LINKS = {
  spotify: "https://open.spotify.com/artist/3iUKOkvtyfkAcg8pOWU5wp",
  apple: "https://music.apple.com/us/artist/meghan-clarisse/1484763484",
  amazon: "https://music.amazon.com/artists/B082L4182W/meghan-clarisse",
  buy: `${WP_ORIGIN}/shop/`,
};

export const RELEASES: Release[] = [
  // No WP page or Shop product yet — keeps the titled placeholder until Meg adds
  // a cover (set the release page's Featured Image, or add a Shop product).
  { year: "2026", type: "SINGLE", title: "Everything You Are To Me", art: null },
  {
    year: "2025",
    type: "LP",
    title: "Shadows of a Ghost Town",
    art: null,
    pageSlug: "shadows-of-a-ghost-town",
    productSlug: "shadows-of-a-ghost-town-cd",
    detailSlug: "shadows-of-a-ghost-town",
  },
  {
    year: "2024",
    type: "EP",
    title: "Kindred Spirits",
    art: null,
    pageSlug: "kindred-spirits",
    productSlug: "kindred-spirits-ep",
    detailSlug: "kindred-spirits",
  },
  {
    year: "2023",
    type: "EP",
    title: "Songs from the Sofa",
    art: null,
    pageSlug: "songs-from-the-sofa",
    productSlug: "songs-from-the-sofa-cd",
    detailSlug: "songs-from-the-sofa",
  },
];
