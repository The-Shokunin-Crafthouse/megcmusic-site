"use client";

/**
 * TanStack Query hooks for the Home/Stats screens' server state (Sprint 10
 * P4-A): tips (single + Home's "Why this works?" 3-item fetch), the daily
 * recommendation, and the Stats/Home post list. Mirrors
 * useGenerationJob.ts's existing fetch-and-throw-on-non-2xx convention so
 * every query surfaces failures the same way.
 */

import { useQuery } from "@tanstack/react-query";
import type { TipSurface } from "@/lib/playbook/generation";

export interface TipResponse {
  id: string;
  body: string;
  surface: TipSurface;
}

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error: unknown }).error);
  }
  return fallback;
}

async function fetchJson<T>(url: string, fallbackError: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(await extractErrorMessage(res, fallbackError));
  }
  return (await res.json()) as T;
}

function tipsUrl(surface: TipSurface, tags: string[]): string {
  const params = new URLSearchParams({ surface });
  const tagsKey = tags.join(",");
  if (tagsKey) params.set("tags", tagsKey);
  return `/api/playbook/tips?${params.toString()}`;
}

/** One tip for a surface (+ optional context tags) — Home's Daily Insight
 *  card, or Stats' "Show Insight" comparison line. `enabled` lets a caller
 *  defer the fetch until an expandable actually opens (Stats' Show
 *  Insight). A 404 ("no active tips for this surface") resolves to `null`
 *  rather than a query error — specs.md §10's tip row treats a missing tip
 *  as an empty state (render the surface's default line), not a failure;
 *  a real fetch failure still rejects and is treated as the "hide the tip
 *  line" error state by the caller. */
export function useTip(surface: TipSurface, tags: string[] = [], enabled = true) {
  const tagsKey = tags.join(",");
  return useQuery({
    queryKey: ["playbook", "tip", surface, tagsKey],
    queryFn: async (): Promise<TipResponse | null> => {
      const res = await fetch(tipsUrl(surface, tags));
      if (res.status === 404) return null;
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Failed to load tip."));
      }
      return (await res.json()) as TipResponse;
    },
    enabled,
    staleTime: 60_000,
  });
}

/** Home's "Why this works?" expandable (specs.md §9.8): up to 3 tips,
 *  fetched as 3 parallel calls to the same `why_this_works` tips route
 *  (the tips route's own least-recently-shown selection can race under
 *  concurrency and return the same tip more than once — dedupe by id
 *  rather than serializing the calls, per the sprint contract's "simplest
 *  honest approach"). Only runs while `enabled` (the expandable is open),
 *  so a Daily-Insight-only page load never spends 3 extra requests. */
export function useWhyThisWorksTips(whyTags: string[], enabled: boolean) {
  const tagsKey = whyTags.join(",");
  return useQuery({
    queryKey: ["playbook", "why-this-works", tagsKey],
    queryFn: async (): Promise<TipResponse[]> => {
      const url = tipsUrl("why_this_works", whyTags);
      const results = await Promise.all(
        [0, 1, 2].map(async () => {
          const res = await fetch(url);
          if (!res.ok) return null;
          return (await res.json()) as TipResponse;
        }),
      );
      const seen = new Set<string>();
      const deduped: TipResponse[] = [];
      for (const tip of results) {
        if (!tip || seen.has(tip.id)) continue;
        seen.add(tip.id);
        deduped.push(tip);
      }
      return deduped;
    },
    enabled,
    staleTime: 60_000,
  });
}

export interface RecommendationWeeklyEntry {
  day: string;
  window: string;
  headline: string;
  seedIdea: string;
}

export interface RecommendationResponse {
  headline: string;
  detail: string;
  seedIdea: string;
  whyTags: string[];
  weekly: RecommendationWeeklyEntry[];
}

/** Home's "Your Next Post" + weekly plan — deterministic per calendar day
 *  server-side, so a generous staleTime just avoids redundant refetches
 *  within the same session rather than masking anything stale. */
export function useRecommendation() {
  return useQuery({
    queryKey: ["playbook", "recommendation"],
    queryFn: () =>
      fetchJson<RecommendationResponse>(
        "/api/playbook/recommendation",
        "Failed to load today's recommendation.",
      ),
    staleTime: 5 * 60_000,
  });
}

export type PostsRange = "all" | "week";
export type PostsSort = "score" | "reach" | "engagement";

export interface PlaybookPost {
  id: string;
  permalink: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productType: string;
  postedAt: string;
  reach: number;
  engagement: number;
  rate: number;
  score: number;
}

/** GET /api/playbook/posts?range&sort — backs the Stats screen's filter
 *  chips and Home's "Last Post" block (called with the endpoint's default
 *  range="all"/sort="score" — see HomeScreen's resolved-ambiguity note). */
export function usePosts(opts: { range: PostsRange; sort: PostsSort }) {
  return useQuery({
    queryKey: ["playbook", "posts", opts.range, opts.sort],
    queryFn: () =>
      fetchJson<PlaybookPost[]>(
        `/api/playbook/posts?range=${opts.range}&sort=${opts.sort}`,
        "Failed to load posts.",
      ),
    staleTime: 60_000,
  });
}
