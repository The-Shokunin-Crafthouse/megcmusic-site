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
import {
  MIN_REACH_FOR_RATE,
  STALE_AFTER_HOURS,
  type DashboardHealth,
  type PlaybookSummary,
  type ProductType,
  type TopPost,
} from "@/lib/playbook/types";

export const dynamic = "force-dynamic";

interface ScorablePost {
  id: string;
  permalink: string;
  thumbnail_url: string | null;
  caption: string | null;
  product_type: string;
  posted_at: string;
  reach: number;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
}

const PAGE_SIZE = 1000;
const TOP_N = 5;

/** Paginates to exhaustion (learning #84 — an unbounded `.select()` caps at
 *  1000 rows with no error). This account is nowhere near that, but the top
 *  5 must be computed over every scorable post, not a silently-truncated
 *  first page. */
async function fetchScorablePosts(
  db: ReturnType<typeof appDb>,
): Promise<ScorablePost[]> {
  const rows: ScorablePost[] = [];
  let from = 0;
  for (;;) {
    const res = await db
      .from("sp_posts")
      .select(
        "id, permalink, thumbnail_url, caption, product_type, posted_at, reach, likes, comments, saved, shares",
      )
      .eq("metrics_available", true)
      .gte("reach", MIN_REACH_FOR_RATE)
      .range(from, from + PAGE_SIZE - 1);
    if (res.error) throw new Error(res.error.message);
    const page = (res.data ?? []) as ScorablePost[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

function topPostsFrom(rows: ScorablePost[]): TopPost[] {
  return rows
    .map((row): TopPost => {
      const engagement =
        (row.likes ?? 0) +
        (row.comments ?? 0) +
        (row.saved ?? 0) +
        (row.shares ?? 0);
      return {
        id: row.id,
        permalink: row.permalink,
        thumbnailUrl: row.thumbnail_url,
        caption: row.caption,
        productType: row.product_type as ProductType,
        postedAt: row.posted_at,
        reach: row.reach,
        engagement,
        rate: engagement / row.reach,
      };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, TOP_N);
}

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
