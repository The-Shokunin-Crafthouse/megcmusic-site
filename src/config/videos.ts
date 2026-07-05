/**
 * Latest Videos config (Figma 39:191). Levi-editable.
 * - primaryVideoId: the featured/hero embed.
 * - extraVideoIds: videos from OTHER channels (e.g. venues posting live sets) to
 *   merge into the list — the channel RSS won't include these.
 * - seedVideoIds: the current /videos lineup, used until the RSS is fetched and
 *   as the order anchor. The channel's newest uploads are merged in ahead.
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
