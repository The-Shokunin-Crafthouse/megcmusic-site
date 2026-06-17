/**
 * The Events Calendar REST API (tribe/events/v1) — shows.
 * Shows refresh hourly (ISR). Date bounds use the literal
 * `now` keyword the API accepts, avoiding any client-side
 * date math (and the bare-number epoch trap).
 */

const EVENTS_API_URL =
  process.env.EVENTS_API_URL ?? "https://megcmusic.com/wp-json/tribe/events/v1";

// Bound every call so a slow/unreachable WordPress host can never hang a build
// or an ISR revalidation. From a normal network the API answers in <1s; the
// build region occasionally cannot reach it, so we fail fast into the caller's
// empty-state instead of stalling past Next's static-generation timeout.
const REQUEST_TIMEOUT_MS = 12_000;

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
  /** WordPress publish datetime ("YYYY-MM-DD HH:MM:SS"). Orders the
   *  "Just Added" tab newest-first; optional — absent on some payloads. */
  date?: string;
  all_day: boolean;
  image?: { url: string } | false;
  venue?: TribeVenue;
}

interface TribeEventsResponse {
  events?: TribeEvent[];
  total: number;
  total_pages: number;
}

export async function getEvents(
  status: "upcoming" | "past",
): Promise<TribeEvent[]> {
  const query =
    status === "upcoming"
      ? "?per_page=50&start_date=now"
      : "?per_page=50&end_date=now";
  const res = await fetch(`${EVENTS_API_URL}/events${query}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    // The archive endpoint 404s when a date query matches nothing.
    if (res.status === 404) return [];
    throw new Error(`Events (${status}) → ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as TribeEventsResponse;
  return data.events ?? [];
}

export async function getEvent(id: number): Promise<TribeEvent | null> {
  const res = await fetch(`${EVENTS_API_URL}/events/${id}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  return (await res.json()) as TribeEvent;
}
