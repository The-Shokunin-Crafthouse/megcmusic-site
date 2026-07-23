/**
 * GET /api/playbook/posts?range=all|week&sort=score|reach|engagement —
 * page-facing (unguarded, same posture as /api/playbook/summary). Backs
 * both the Stats screen's filter-chip list and Home's "Last Post" block
 * (called with the default range/sort — see HomeScreen).
 *
 * Reuses `fetchScorablePosts` (same `metrics_available` + reach-floor gate
 * as the existing Top-5 summary route) and the new `scoredPostsFrom`
 * (src/lib/playbook/scoring.ts) so this list can never compute a different
 * engagement rate than the Top-5 dashboard. Capped at 20 rows per the
 * sprint contract (the DB fetch itself pages to exhaustion past Supabase's
 * 1000-row cap — learning #84 — the 20-cap is a display limit applied
 * after sorting, not a query limit).
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";
import {
  fetchScorablePosts,
  scoredPostsFrom,
  type PostRange,
  type PostSort,
} from "@/lib/playbook/scoring";

export const dynamic = "force-dynamic";

const VALID_SORTS: readonly PostSort[] = ["score", "reach", "engagement"];
const VALID_RANGES: readonly PostRange[] = ["all", "week"];
const MAX_POSTS = 20;

function isSort(value: string | null): value is PostSort {
  return value !== null && (VALID_SORTS as readonly string[]).includes(value);
}

function isRange(value: string | null): value is PostRange {
  return value !== null && (VALID_RANGES as readonly string[]).includes(value);
}

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const rangeParam = url.searchParams.get("range") ?? "all";
    const sortParam = url.searchParams.get("sort") ?? "score";

    if (!isRange(rangeParam)) {
      return fail('"range" must be "all" or "week".', 400);
    }
    if (!isSort(sortParam)) {
      return fail('"sort" must be "score", "reach", or "engagement".', 400);
    }

    const db = appDb();
    const rows = await fetchScorablePosts(db);
    const posts = scoredPostsFrom(rows, { sort: sortParam, range: rangeParam }).slice(
      0,
      MAX_POSTS,
    );

    return ok(posts);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Failed to load posts.", 500);
  }
}
