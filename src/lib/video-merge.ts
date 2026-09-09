/**
 * The order videos appear on Home and the Media page (Sprint 12, Phase A).
 *
 * Meg's pinned featured video leads, then her curated list in her order, then
 * the channel's newest uploads, then any cross-channel extras — deduped. The
 * gallery shows the active video plus four more, so whatever sits in the first
 * five here is what a visitor sees; the rest is reachable only by that order
 * changing. Until 2026-09-09 the channel's newest uploads came BEFORE her list,
 * which meant a video she added appeared only if it also happened to be one of
 * the channel's four newest — the field's help text ("The playlist order on
 * Home and Media") was not what the site did. See decisions.md 2026-09-09.
 *
 * Pure: no fetch, no environment, so it is unit-tested directly.
 */
export interface VideoSources {
  /** Her pinned featured tile; empty when she has not set one. */
  featured: string;
  /** Her curated list, in her order. */
  curated: readonly string[];
  /** The channel's newest uploads, newest first (RSS). */
  channel: readonly string[];
  /** Cross-channel videos the RSS omits — plumbing, from src/config/videos.ts. */
  extras: readonly string[];
}

export function mergeVideoIds({ featured, curated, channel, extras }: VideoSources): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const id of [featured, ...curated, ...channel, ...extras]) {
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}
