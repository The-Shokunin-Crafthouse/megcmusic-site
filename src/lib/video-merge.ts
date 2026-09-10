/**
 * The order videos appear on Home and the Media page (Sprint 12, Phase A).
 *
 * Meg's pinned featured video leads, then her whole curated list in her order,
 * then any cross-channel extras — deduped. The channel's newest uploads are a
 * FALLBACK: they fill the list only when she has curated nothing, so the site
 * never shows a video she did not pick. The gallery renders every entry
 * (Levi, 2026-09-10: "show her whole list"); until then it showed five, and
 * until 2026-09-09 the channel feed came before her list, so a video she
 * added appeared only if it was also one of the channel's four newest.
 * See decisions.md 2026-09-09 and 2026-09-10.
 *
 * Pure: no fetch, no environment, so it is unit-tested directly.
 */
export interface VideoSources {
  /** Her pinned featured tile; empty when she has not set one. */
  featured: string;
  /** Her curated list, in her order. */
  curated: readonly string[];
  /** The channel's newest uploads, newest first (RSS). Used only when `curated` is empty. */
  channel: readonly string[];
  /** Cross-channel videos the RSS omits — plumbing, from src/config/videos.ts. */
  extras: readonly string[];
}

export function mergeVideoIds({ featured, curated, channel, extras }: VideoSources): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const fill = curated.length ? curated : channel;
  for (const id of [featured, ...fill, ...extras]) {
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
