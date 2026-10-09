/**
 * The Events Calendar REST API (tribe/events/v1) — show types.
 * The archive is read at build by scripts/fetch-events.mjs into
 * src/generated/wp-content/events.json (the Vercel runtime cannot reach
 * WordPress), and the browser refreshes upcoming shows from
 * events-browser.ts. `splitShows` decides upcoming vs past.
 */

export interface TribeVenue {
  venue?: string;
  address?: string;
  city?: string;
  state_province?: string;
}

export interface TribeEvent {
  id: number;
  global_id: string;
  status: string;
  title: string;
  description: string;
  excerpt: string;
  url: string;
  start_date: string;
  end_date: string;
  /** End as UTC "YYYY-MM-DD HH:MM:SS". The upcoming/past split reads this, so
   *  a show stays upcoming until it ends wherever the visitor is. */
  utc_end_date?: string;
  /** WordPress publish datetime ("YYYY-MM-DD HH:MM:SS"). Orders the
   *  "Just Added" tab newest-first; optional — absent on some payloads. */
  date?: string;
  all_day: boolean;
  image?: { url: string } | false;
  venue?: TribeVenue;
  /** IANA zone the wall-clock times are in (e.g. "America/Denver"). Feeds the
   *  add-to-calendar control so an event lands at the venue's local time. */
  timezone?: string;
}

export interface TribeEventsResponse {
  events?: TribeEvent[];
  total: number;
  total_pages: number;
}

/** One page of the archive plus the totals the tribe API reports in the body
 *  (`total_pages` / `total` — confirmed against the live payload; also mirrored
 *  in the `x-tec-totalpages` / `x-tec-total` headers). */
