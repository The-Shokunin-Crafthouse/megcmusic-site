"use client";

/**
 * TanStack Query hooks for the saved-storyboard library (Sprint 10 P5,
 * specs.md Screen 8). Mirrors usePlaybookData.ts's fetch-and-throw
 * convention. Three operations, matching the two route handlers exactly:
 *
 *  - `useStoryboardsList` -> GET /api/playbook/storyboards (partial rows:
 *    id/idea/chosen_title/created_at/frames — the route's own `.select()`
 *    list, capped at 100). No `posting_window` in this shape: the list
 *    route doesn't select it (repo learning #84's cap discipline extends to
 *    not over-fetching for a row the UI won't show it on), so the library
 *    row's meta line reads "N frames / <date>" only — a small, honest gap
 *    from specs.md's "posting window (first clause)" flagged in the P5
 *    return rather than reaching into the route (out of this pass's
 *    ownership) or N+1-fetching every row's full detail just for a list.
 *  - `useStoryboard(id)` -> GET /api/playbook/storyboards/[id] (full row —
 *    the library's revisit-mode detail fetch).
 *  - `useSaveStoryboard` -> POST /api/playbook/storyboards (Screen 7's
 *    "Save to library"). The route's `saveStoryboardSchema` extends
 *    `storyboardOutputSchema`, so `hashtags` is required in the body even
 *    though the P5 sprint note's abbreviated payload example omits it —
 *    confirmed by reading the route directly, included here to match the
 *    real contract.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Frame, TitleOption } from "@/lib/playbook/generation";
import type { StoryboardRow } from "@/lib/playbook/types";

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error: unknown }).error);
  }
  return fallback;
}

export interface StoryboardListItem {
  id: string;
  idea: string;
  chosen_title: string | null;
  created_at: string;
  frames: Frame[];
  posting_window: string | null;
}

/** Library list (Screen 8). 30s staleTime — a saved list changes only on
 *  this session's own saves, which explicitly invalidate it below. */
export function useStoryboardsList() {
  return useQuery({
    queryKey: ["playbook", "storyboards"],
    queryFn: async (): Promise<StoryboardListItem[]> => {
      const res = await fetch("/api/playbook/storyboards");
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Couldn't load the library."));
      }
      return (await res.json()) as StoryboardListItem[];
    },
    staleTime: 30_000,
  });
}

/** Full saved storyboard (revisit-mode detail). Disabled while `id` is
 *  null, matching `useGenerationJob`'s convention. */
export function useStoryboard(id: string | null) {
  return useQuery({
    queryKey: ["playbook", "storyboard", id],
    queryFn: async (): Promise<StoryboardRow> => {
      const res = await fetch(`/api/playbook/storyboards/${id}`);
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Couldn't load storyboard."));
      }
      return (await res.json()) as StoryboardRow;
    },
    enabled: id !== null,
    staleTime: 60_000,
  });
}

export interface SaveStoryboardInput {
  idea: string;
  answers: Record<string, unknown> | null;
  frames: Frame[];
  titleOptions: TitleOption[];
  chosenTitle: string;
  caption: string;
  hashtags: string[];
  postingWindow: string;
}

/** Screen 7's "Save to library". Invalidates the list query on success so
 *  a subsequent library open reflects the new row without a manual
 *  refetch call at the call site. */
export function useSaveStoryboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveStoryboardInput): Promise<StoryboardRow> => {
      const res = await fetch("/api/playbook/storyboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        throw new Error(await extractErrorMessage(res, "Couldn't save — try again."));
      }
      return (await res.json()) as StoryboardRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["playbook", "storyboards"] });
    },
  });
}
