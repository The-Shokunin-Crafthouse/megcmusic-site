/**
 * Discography (Figma 128:673). Levi-editable config. Streaming buttons point at
 * Meg's artist-level profiles for now — per-release deep links are a later swap
 * (just add `spotify`/`apple` to a release to override). `art` is null until a
 * cover is dropped in; the row shows a titled placeholder meanwhile.
 */
export interface Release {
  year: string;
  type: "SINGLE" | "EP" | "LP";
  title: string;
  art: string | null;
  /** Per-release overrides; fall back to the artist profiles below. */
  spotify?: string;
  apple?: string;
  buy?: string;
}

export const ARTIST_LINKS = {
  spotify: "https://open.spotify.com/artist/3iUKOkvtyfkAcg8pOWU5wp",
  apple: "https://music.apple.com/us/artist/meghan-clarisse/1484763484",
  amazon: "https://music.amazon.com/artists/B082L4182W/meghan-clarisse",
  buy: "https://www.megcmusic.com/shop/",
};

export const RELEASES: Release[] = [
  { year: "2026", type: "SINGLE", title: "Everything You Are To Me", art: null },
  { year: "2025", type: "LP", title: "Shadows of a Ghost Town", art: null },
  { year: "2024", type: "EP", title: "Kindred Spirits", art: null },
  { year: "2023", type: "EP", title: "Songs from the Sofa", art: null },
];
