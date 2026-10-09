/**
 * The Events Calendar REST API (tribe/events/v1) — shows.
 * Shows refresh hourly (ISR). The whole archive is fetched over a fixed
 * window and split into upcoming/past by `splitShows` against each show's
 * real end time. Never bound a query with TEC's `now`: it rounds to the UTC
 * day, which dropped a Denver show at 6pm local mid-set, and `end_date=now`
 * alone defaults its start to now as well and matches nothing.
 */

import { WP_ORIGIN } from "@/lib/wp-origin";
import { ARCHIVE_WINDOW, slimEvent } from "@/lib/show-split";

const EVENTS_API_URL =
  process.env.EVENTS_API_URL ?? `${WP_ORIGIN}/wp-json/tribe/events/v1`;

// Bound every call so a slow/unreachable WordPress host can never hang a build
// or an ISR revalidation. From a normal network the API answers in <1s, but the
// Vercel build region is slow/flaky reaching it — a 12s bound emptied the page
// at build. Give it 25s and one retry so transient slowness recovers, while a
// truly unreachable host still fails into the caller's empty-state well within
// Next's static-generation timeout.
const REQUEST_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 1;

// fetch() only rejects on network/timeout (not HTTP status), so a retry here
// covers exactly the transient-slowness case; status handling stays in callers.
async function fetchEvents(url: string): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fetch(url, {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

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
export interface EventsPage {
  events: TribeEvent[];
  totalPages: number;
  total: number;
}

/** Fetch a single page of the archive. Every page carries the same bound + retry
 *  as the rest of this module, so no single request can stall a build or an ISR
 *  revalidation. */
export async function getEventsPage(
  page: number,
  perPage: number,
): Promise<EventsPage> {
  const res = await fetchEvents(
    `${EVENTS_API_URL}/events?per_page=${perPage}&page=${page}&${ARCHIVE_WINDOW}`,
  );
  if (!res.ok) {
    // The archive endpoint 404s when a date query matches nothing.
    if (res.status === 404) return { events: [], totalPages: 0, total: 0 };
    throw new Error(`Events (p${page}) → ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as TribeEventsResponse;
  return {
    events: (data.events ?? []).map(slimEvent),
    totalPages: data.total_pages ?? 0,
    total: data.total ?? 0,
  };
}

/** Every show, past and upcoming, paginated to exhaustion at build. Page 1
 *  reports the page count; the rest fetch in parallel, each independently
 *  bounded. Callers split the result with `splitShows`. */
export async function getAllEvents(perPage = 50): Promise<TribeEvent[]> {
  const first = await getEventsPage(1, perPage);
  if (first.totalPages <= 1) return first.events;
  const rest = await Promise.all(
    Array.from({ length: first.totalPages - 1 }, (_, i) =>
      getEventsPage(i + 2, perPage),
    ),
  );
  return [first.events, ...rest.map((p) => p.events)].flat();
}

export async function getEvent(id: number): Promise<TribeEvent | null> {
  const res = await fetchEvents(`${EVENTS_API_URL}/events/${id}`);
  if (!res.ok) return null;
  return (await res.json()) as TribeEvent;
}
