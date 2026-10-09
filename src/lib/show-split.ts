/**
 * Upcoming vs past, decided here rather than by the Events API. TEC's `now`
 * bound rounds to the UTC day, so a Denver show fell off Up Next at 6pm local
 * (midnight UTC) mid-set, and `end_date=now` alone defaulted its start to now
 * too and matched nothing. The full archive is fetched instead and each show
 * stays upcoming until its own end time.
 *
 * Comparison is on `utc_end_date` ("YYYY-MM-DD HH:MM:SS", UTC) as plain text
 * against `now` formatted the same way — no Date built from an event string
 * (studio learning #48).
 */

import type { TribeEvent } from "./api/events";
import { slimEvent as slimEventJs } from "./tec-archive.mjs";

export { ARCHIVE_WINDOW } from "./tec-archive.mjs";

/** Rows per tab on the home section. Home ships only upcoming plus this many
 *  past shows; a show that ends after render still sorts to the top of Past. */
export const HOME_ROWS = 7;

/** An event cut to the fields the show cards and calendar button read. */
export const slimEvent = slimEventJs as (event: TribeEvent) => TribeEvent;

/** Days before now the browser's upcoming refresh starts. A margin wider than
 *  any UTC offset, so the partition below never splits a show's day. */
const REFRESH_DAYS = 3;

/** The refresh window's first day, "YYYY-MM-DD" (UTC). */
export function refreshWindowStart(nowMs: number): string {
  return utcStamp(nowMs - REFRESH_DAYS * 86_400_000).slice(0, 10);
}

/** The build's archive with every show from `windowStart` on replaced by the
 *  browser's refresh of that window. TEC's `start_date` bound filters on the
 *  event's own start_date, so comparing the same field against the same day
 *  partitions the list exactly: a show Meg added appears, a moved one updates,
 *  a cancelled one drops. */
export function mergeRefresh(
  build: TribeEvent[],
  refreshed: TribeEvent[],
  windowStart: string,
): TribeEvent[] {
  const cut = `${windowStart} 00:00:00`;
  return [...build.filter((e) => e.start_date < cut), ...refreshed];
}

export interface SplitShows {
  upcoming: TribeEvent[];
  justAdded: TribeEvent[];
  past: TribeEvent[];
}

/** Epoch ms as a UTC "YYYY-MM-DD HH:MM:SS" stamp. */
function utcStamp(ms: number): string {
  return new Date(ms).toISOString().slice(0, 19).replace("T", " ");
}

// "YYYY-MM-DD HH:MM:SS" strings sort chronologically as plain text.
const byStart = (dir: 1 | -1) => (a: TribeEvent, b: TribeEvent) =>
  dir * a.start_date.localeCompare(b.start_date);

// "Just Added" = upcoming, newest publish date first. When the payload omits
// `date`, the comparison is a no-op and Up Next order is preserved.
const byPublished = (a: TribeEvent, b: TribeEvent) =>
  (b.date ?? "").localeCompare(a.date ?? "");

export function splitShows(events: TribeEvent[], nowMs: number): SplitShows {
  const now = utcStamp(nowMs);
  const seen = new Set<number>();
  const upcoming: TribeEvent[] = [];
  const past: TribeEvent[] = [];
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    const end = event.utc_end_date ?? event.end_date;
    (end > now ? upcoming : past).push(event);
  }
  upcoming.sort(byStart(1));
  past.sort(byStart(-1));
  return { upcoming, justAdded: [...upcoming].sort(byPublished), past };
}
