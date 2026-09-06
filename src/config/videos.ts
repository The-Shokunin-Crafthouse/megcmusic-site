/**
 * Latest Videos config (Figma 39:191) — the parts that stay in code.
 *
 * WHICH videos show, and which one leads, now come from Meg's WP Videos page
 * (admin → Pages → "Videos"): the ACF "Featured video" field and her video
 * list, read at build by src/lib/videos-content.ts. What is left here is
 * plumbing she has no reason to edit:
 * - CHANNEL_ID / channelUrl: her YouTube channel, for the RSS feed and the
 *   right-rail link.
 * - extraVideoIds: cross-channel videos (e.g. a venue's live set) the channel
 *   RSS omits and that are not hers to list — a studio task, not an edit.
 *
 * VideosGallery still reconciles against her Videos page from the visitor's
 * browser, so a YouTube block pasted into the page body also appears.
 */
export const CHANNEL_ID = "UCCns9wV-KGZI05bsBezql5w";

/** Public channel page — linked from the videos right rail. */
export const channelUrl = `https://www.youtube.com/channel/${CHANNEL_ID}`;

export const extraVideoIds: string[] = [];
