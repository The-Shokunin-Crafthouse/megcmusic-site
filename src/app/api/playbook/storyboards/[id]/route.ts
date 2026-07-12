/**
 * /api/playbook/storyboards/[id] — page-facing (unguarded).
 *
 * GET returns the full saved storyboard. PATCH is field-level allowlisted to
 * `chosen_title` only (repo learning #105) — everything else about a saved
 * storyboard is immutable; picking a different title from the options is the
 * one edit the library screen needs.
 */

import { z } from "zod";
import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";
import type { StoryboardRow } from "@/lib/playbook/types";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const patchSchema = z
  .object({ chosen_title: z.string().min(1) })
  .strict();

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return fail(`"${id}" is not a valid storyboard id.`, 400);
    }

    const db = appDb();
    const storyboardRes = await db
      .from("storyboards")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (storyboardRes.error) return fail(storyboardRes.error.message, 502);
    if (!storyboardRes.data) return fail(`No storyboard with id "${id}".`, 404);

    return ok(storyboardRes.data as StoryboardRow);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to load storyboard.",
      500,
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return fail(`"${id}" is not a valid storyboard id.`, 400);
    }

    const raw = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(raw);
    if (!parsed.success) {
      return fail(
        `Only "chosen_title" may be updated. ${parsed.error.message}`,
        400,
      );
    }

    const db = appDb();
    const updateRes = await db
      .from("storyboards")
      .update({ chosen_title: parsed.data.chosen_title })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (updateRes.error) return fail(updateRes.error.message, 502);
    if (!updateRes.data) return fail(`No storyboard with id "${id}".`, 404);

    return ok(updateRes.data as StoryboardRow);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to update storyboard.",
      500,
    );
  }
}
