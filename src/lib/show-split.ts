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

/** Query bounds covering every show on record and every one booked. Explicit
 *  dates, because TEC's `now` keyword rounds to the UTC day. */
export const ARCHIVE_WINDOW = "start_date=2000-01-01&end_date=2100-12-31";

/** Rows per tab on the home section. Home ships only upcoming plus this many
 *  past shows; a show that ends after render still sorts to the top of Past. */
export const HOME_ROWS = 7;

/** An event cut to the fields the show cards and calendar button read. The
 *  full TEC payload is ~2.7 KB a show; the archive is 400+ shows. */
export function slimEvent(event: TribeEvent): TribeEvent {
  const { venue } = event;
  return {
    id: event.id,
    global_id: event.global_id,
    status: event.status,
    title: event.title,
    description: "",
    excerpt: "",
    url: event.url,
    start_date: event.start_date,
    end_date: event.end_date,
    utc_end_date: event.utc_end_date,
    date: event.date,
    all_day: event.all_day,
    timezone: event.timezone,
    venue: venue
      ? {
          venue: venue.venue,
          address: venue.address,
          city: venue.city,
          state_province: venue.state_province,
        }
      : undefined,
  };
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
