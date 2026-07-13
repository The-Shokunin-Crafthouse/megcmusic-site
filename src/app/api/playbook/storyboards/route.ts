/**
 * /api/playbook/storyboards — page-facing (unguarded, same posture as the
 * rest of the generation queue).
 *
 * POST saves a generated storyboard the creation flow accepted. The
 * `storyboards` table (20260713000000_playbook_generation_init.sql) has no
 * `hashtags` column — the storyboard job's output contract carries
 * `hashtags` as its own array (validated separately against
 * `storyboardOutputSchema` in generation.ts) purely so the daemon's JSON
 * contract is unambiguous, but there's nowhere to persist it separately, so
 * on save it's folded onto the end of the stored `caption` text, matching
 * how "caption with hashtags" reads on the screen.
 *
 * GET lists saved storyboards newest-first, capped at 100 rows via an
 * explicit `.range()` (repo learning #84 — an unbounded `.select()` silently
 * caps at 1000 with no error/truncation signal).
 */

import { z } from "zod";
import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";
import { storyboardOutputSchema } from "@/lib/playbook/generation";
import type { StoryboardRow } from "@/lib/playbook/types";

export const dynamic = "force-dynamic";

const LIST_CAP = 100;

const saveStoryboardSchema = storyboardOutputSchema.extend({
  idea: z.string().min(1),
  answers: z.record(z.string(), z.unknown()).nullable().optional(),
  chosenTitle: z.string().min(1).optional(),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = await req.json().catch(() => null);
    const parsed = saveStoryboardSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(`Invalid storyboard: ${parsed.error.message}`, 400);
    }
    const {
      idea,
      answers,
      frames,
      titleOptions,
      caption,
      hashtags,
      postingWindow,
      chosenTitle,
    } = parsed.data;

    const storedCaption =
      hashtags.length > 0 ? `${caption}\n\n${hashtags.join(" ")}` : caption;

    const db = appDb();
    const insertRes = await db
      .from("storyboards")
      .insert({
        idea,
        answers: answers ?? null,
        frames,
        title_options: titleOptions,
        chosen_title: chosenTitle ?? null,
        caption: storedCaption,
        posting_window: postingWindow,
      })
      .select("*")
      .single();
    if (insertRes.error) return fail(insertRes.error.message, 502);

    return ok(insertRes.data as StoryboardRow, 201);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to save storyboard.",
      500,
    );
  }
}

export async function GET(): Promise<Response> {
  try {
    const db = appDb();
    const listRes = await db
      .from("storyboards")
      .select("id, idea, chosen_title, created_at, frames, posting_window")
      .order("created_at", { ascending: false })
      .range(0, LIST_CAP - 1);
    if (listRes.error) return fail(listRes.error.message, 502);

    return ok(listRes.data ?? []);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to list storyboards.",
      500,
    );
  }
}
