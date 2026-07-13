/**
 * Shared top-5 scoring — used by both GET /api/playbook/summary (the
 * page-facing read) and the sync route (to know which posts need a
 * thumbnail refresh). One definition so the two consumers can never drift.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  MIN_REACH_FOR_RATE,
  type ProductType,
  type TopPost,
} from "@/lib/playbook/types";

export interface ScorablePost {
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
export async function fetchScorablePosts(
  db: SupabaseClient,
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

export function topPostsFrom(rows: ScorablePost[]): TopPost[] {
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

/** Sprint 10 P4-A — Stats screen / GET /api/playbook/posts (§scoring
 *  extension: "extend, never change existing exports"). `score` is an
 *  alias of `rate` (same engagement-rate definition as `topPostsFrom`,
 *  named `score` because that's the Stats chip's own vocabulary) — kept as
 *  its own field rather than reusing `rate` under a new name so the wire
 *  shape matches the sprint contract exactly. */
export type PostSort = "score" | "reach" | "engagement";
export type PostRange = "all" | "week";

export interface ScoredPost extends TopPost {
  score: number;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Builds the full (not Top-5-sliced) derived-metric list for the Stats
 *  screen, sorted per `sort` and optionally windowed by `range`. Reuses
 *  `fetchScorablePosts`'s DB shape and the same engagement-rate derivation
 *  as `topPostsFrom` so the two can never drift (learning #96 — derive
 *  once, read everywhere). */
export function scoredPostsFrom(
  rows: ScorablePost[],
  opts: { sort: PostSort; range: PostRange },
): ScoredPost[] {
  const cutoff = Date.now() - WEEK_MS;
  const windowed =
    opts.range === "week"
      ? rows.filter((row) => new Date(row.posted_at).getTime() >= cutoff)
      : rows;

  const scored: ScoredPost[] = windowed.map((row) => {
    const engagement =
      (row.likes ?? 0) +
      (row.comments ?? 0) +
      (row.saved ?? 0) +
      (row.shares ?? 0);
    const rate = engagement / row.reach;
    return {
      id: row.id,
      permalink: row.permalink,
      thumbnailUrl: row.thumbnail_url,
      caption: row.caption,
      productType: row.product_type as ProductType,
      postedAt: row.posted_at,
      reach: row.reach,
      engagement,
      rate,
      score: rate,
    };
  });

  const sortKey: Record<PostSort, "score" | "reach" | "engagement"> = {
    score: "score",
    reach: "reach",
    engagement: "engagement",
  };
  const key = sortKey[opts.sort];
  return scored.sort((a, b) => b[key] - a[key]);
}
