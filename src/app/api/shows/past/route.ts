import { getEventsPage } from "@/lib/api/events";

// Same-origin proxy for the /shows "Show more" control. The browser never calls
// the tribe API directly (no CORS surface, no exposed upstream); this handler
// fetches one archive page server-side — already bounded by the 12s AbortSignal
// in getEventsPage — and returns it newest-first, matching the build render.
export const revalidate = 3600;

const MAX_PER_PAGE = 50;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiPage = Number(searchParams.get("apiPage"));
  const perPage = Number(searchParams.get("perPage"));

  if (
    !Number.isInteger(apiPage) ||
    apiPage < 1 ||
    !Number.isInteger(perPage) ||
    perPage < 1 ||
    perPage > MAX_PER_PAGE
  ) {
    return Response.json({ error: "Invalid page request" }, { status: 400 });
  }

  try {
    const { events } = await getEventsPage("past", apiPage, perPage);
    // The tribe API sorts ascending; reverse so each page reads newest-first,
    // and hand back the next page to walk (0 once page 1 is reached).
    return Response.json({
      events: [...events].reverse(),
      nextApiPage: apiPage > 1 ? apiPage - 1 : 0,
    });
  } catch {
    // Surface the failure so the client keeps the button for a retry rather
    // than treating a timeout as "no more shows".
    return Response.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}
