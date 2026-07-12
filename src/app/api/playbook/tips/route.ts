/**
 * GET /api/playbook/tips?surface=X&tags=a,b — page-facing (unguarded).
 *
 * Serves one tip for a surface from the shared `tips` library (PLAN.md §4 —
 * every tip surface draws from one living library, never a hardcoded
 * array). Selection:
 *   1. Only `active=true` rows of the requested surface.
 *   2. If `tags` is given, prefer rows whose `context_tags` overlap it;
 *      fall back to the full active set (untagged or any tag) when nothing
 *      overlaps.
 *   3. Pick least-recently-shown (`last_shown_at` nulls first, then
 *      oldest), tie-broken randomly — EXCEPT `daily_insight`, which is
 *      deterministic per calendar day: today's `YYYY-MM-DD` string is
 *      hashed to an index over the (id-ordered, for a stable index)
 *      candidate list, so the same tip serves all day and changes at
 *      midnight regardless of how many times it's fetched.
 *   4. `times_shown`/`last_shown_at` are updated server-side on every serve,
 *      including for `daily_insight` (its own selection ignores them, but
 *      the counters still track how often each tip has surfaced).
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";
import { TIP_SURFACES, type TipSurface } from "@/lib/playbook/generation";
import type { Tip } from "@/lib/playbook/types";

export const dynamic = "force-dynamic";

function isTipSurface(value: string | null): value is TipSurface {
  return value !== null && (TIP_SURFACES as readonly string[]).includes(value);
}

/** djb2 — deterministic, good enough distribution for a small daily index. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

type Candidate = Pick<
  Tip,
  "id" | "body" | "surface" | "context_tags" | "last_shown_at" | "times_shown"
>;

function tagsOverlap(a: string[], tags: string[]): boolean {
  return a.some((tag) => tags.includes(tag));
}

function pickLeastRecentlyShown(candidates: Candidate[]): Candidate {
  const untouched = candidates.filter((c) => c.last_shown_at === null);
  let pool: Candidate[];
  if (untouched.length > 0) {
    pool = untouched;
  } else {
    const oldest = Math.min(
      ...candidates.map((c) => new Date(c.last_shown_at as string).getTime()),
    );
    pool = candidates.filter(
      (c) => new Date(c.last_shown_at as string).getTime() === oldest,
    );
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickDeterministicDaily(candidates: Candidate[]): Candidate {
  // Candidates arrive id-ordered (query below), so the index is stable for
  // a given date string regardless of call count that day.
  const index = hashString(todayDateString()) % candidates.length;
  return candidates[index];
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const surfaceParam = url.searchParams.get("surface");
    if (!isTipSurface(surfaceParam)) {
      return fail(
        `"surface" must be one of: ${TIP_SURFACES.join(", ")}.`,
        400,
      );
    }
    const surface = surfaceParam;

    const tagsParam = url.searchParams.get("tags");
    const tags = tagsParam
      ? tagsParam
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];

    const db = appDb();
    const activeRes = await db
      .from("tips")
      .select("id, body, surface, context_tags, last_shown_at, times_shown")
      .eq("surface", surface)
      .eq("active", true)
      .order("id", { ascending: true });
    if (activeRes.error) return fail(activeRes.error.message, 502);

    const active = (activeRes.data ?? []) as Candidate[];
    if (active.length === 0) {
      return fail(`No active tips for surface "${surface}".`, 404);
    }

    let candidates = active;
    if (tags.length > 0) {
      const overlapping = active.filter((c) =>
        tagsOverlap(c.context_tags, tags),
      );
      if (overlapping.length > 0) candidates = overlapping;
      // else: fall back to the full active set (untagged or any tag).
    }

    const picked =
      surface === "daily_insight"
        ? pickDeterministicDaily(candidates)
        : pickLeastRecentlyShown(candidates);

    const updateRes = await db
      .from("tips")
      .update({
        times_shown: picked.times_shown + 1,
        last_shown_at: new Date().toISOString(),
      })
      .eq("id", picked.id);
    if (updateRes.error) return fail(updateRes.error.message, 502);

    return ok({ id: picked.id, body: picked.body, surface: picked.surface });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to fetch a tip.",
      500,
    );
  }
}
