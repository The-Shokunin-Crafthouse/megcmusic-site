/**
 * What the prebuild (`scripts/fetch-events.mjs`, run by bare node) and the app
 * share about the TEC archive. Plain JS so both import one copy;
 * `show-split.ts` re-exports these typed.
 */

/** Query bounds covering every show on record and every one booked. Explicit
 *  dates, because TEC's `now` keyword rounds to the UTC day. */
export const ARCHIVE_WINDOW = "start_date=2000-01-01&end_date=2100-12-31";

/**
 * An event cut to the fields the show cards and the calendar button read. The
 * full TEC payload is ~2.7 KB a show and the archive is 400+ shows.
 *
 * @param {Record<string, any>} event A TEC REST event.
 */
export function slimEvent(event) {
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
