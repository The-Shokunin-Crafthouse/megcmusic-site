/**
 * GET /api/playbook/summary — page-facing (unguarded — an internal,
 * noindexed, unlinked page; no write, nothing to guard here).
 *
 * The UI-shaped read for the Performance tab: the top 5 posts by
 * reach-normalized engagement, and sync health. `rate` is computed here
 * (not stored) so the definition lives in exactly one place.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";
import { fetchScorablePosts, topPostsFrom } from "@/lib/playbook/scoring";
import {
  STALE_AFTER_HOURS,
  type DashboardHealth,
  type PlaybookSummary,
} from "@/lib/playbook/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const db = appDb();

    const [scorableRows, latestRunRes] = await Promise.all([
      fetchScorablePosts(db),
      db
        .from("sp_sync_runs")
        .select("status, started_at, finished_at")
        .eq("kind", "sync")
        .order("started_at", { ascending: false })
        .limit(1),
    ]);
    if (latestRunRes.error) return fail(latestRunRes.error.message, 502);

    const latestRun = latestRunRes.data?.[0] ?? null;
    let health: DashboardHealth = "stale";
    let lastSync: string | null = null;

    if (latestRun?.status === "auth_error") {
      health = "auth_error";
      lastSync = latestRun.finished_at ?? latestRun.started_at;
    } else if (latestRun?.status === "ok" && latestRun.finished_at) {
      lastSync = latestRun.finished_at;
      const hoursSince =
        (Date.now() - new Date(latestRun.finished_at).getTime()) /
        (60 * 60 * 1000);
      health = hoursSince > STALE_AFTER_HOURS ? "stale" : "ok";
    }

    const summary: PlaybookSummary = {
      topPosts: topPostsFrom(scorableRows),
      lastSync,
      health,
    };
    return ok(summary);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to load playbook summary.",
      500,
    );
  }
}
