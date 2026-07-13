/**
 * Latest Videos config (Figma 39:191).
 *
 * The LIVE source is Meg's WP Videos page (admin → Pages → "Videos"): the ACF
 * "Featured Video URL" field is the always-on main tile, and the YouTube blocks
 * in the page body are her curated list. Because the WP host blocks datacenter
 * IPs, the server can't read that page — VideosGallery resolves it from the
 * visitor's residential IP and reconciles (see wordpress-browser.ts). This
 * config is the SSR/first-paint fallback, kept in sync with the WP page:
 * - primaryVideoId: featured tile shown until the WP fetch resolves.
 * - seedVideoIds: the list shown until the channel RSS + WP page resolve.
 * - extraVideoIds: cross-channel videos (e.g. a venue's live set) the RSS omits.
 */
export const CHANNEL_ID = "UCCns9wV-KGZI05bsBezql5w";

/** Public channel page — linked from the videos right rail. */
export const channelUrl = `https://www.youtube.com/channel/${CHANNEL_ID}`;

export const primaryVideoId = "A8E_XRwkhTk";

export const extraVideoIds: string[] = [];

export const seedVideoIds = [
  "A8E_XRwkhTk",
  "PJWtlDxvmIc",
  "ABsywqtZp_k",
  "U2rgdUjobD0",
  "SyIj1XDTAiE",
  "WeYjhIiKNiU",
  "xqS1ZpZF7Fc",
  "hwLbMyR4SLw",
  "0gv7iGWPnXU",
];
