/**
 * PATCH /api/outreach/templates/[category] — page-facing (unguarded).
 *
 * Edit and/or approve one category's template. Approval authorizes the weekly
 * run to send from this template without per-draft review, so approve is
 * refused (422) unless the effective body still contains {{PERSONAL_TOUCH}} —
 * the one human, per-prospect sentence the automation must always write.
 * Editing an already-approved template does NOT reset its approval: the weekly
 * run always uses the latest copy.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/outreach/http";
import {
  isCategory,
  PERSONAL_TOUCH_TOKEN,
  type Template,
} from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

interface PatchBody {
  subject_template?: string;
  body_template?: string;
  signature?: string;
  approve?: boolean;
}

function parseBody(raw: unknown): PatchBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  const out: PatchBody = {};
  if ("subject_template" in body) {
    if (typeof body.subject_template !== "string") return null;
    out.subject_template = body.subject_template;
  }
  if ("body_template" in body) {
    if (typeof body.body_template !== "string") return null;
    out.body_template = body.body_template;
  }
  if ("signature" in body) {
    if (typeof body.signature !== "string") return null;
    out.signature = body.signature;
  }
  if ("approve" in body) {
    if (typeof body.approve !== "boolean") return null;
    out.approve = body.approve;
  }
  return out;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ category: string }> },
): Promise<Response> {
  try {
    const { category } = await ctx.params;
    if (!isCategory(category)) {
      return fail(`Unknown category "${category}".`, 404);
    }

    const patch = parseBody(await req.json().catch(() => null));
    if (!patch) return fail("Malformed request body.", 400);

    const db = appDb();

    const existingRes = await db
      .from("templates")
      .select("*")
      .eq("category", category)
      .maybeSingle();
    if (existingRes.error) return fail(existingRes.error.message, 502);
    const existing = existingRes.data as Template | null;
    if (!existing) return fail(`No template for category "${category}".`, 404);

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (patch.subject_template !== undefined) {
      update.subject_template = patch.subject_template;
    }
    if (patch.body_template !== undefined) {
      update.body_template = patch.body_template;
    }
    if (patch.signature !== undefined) update.signature = patch.signature;

    if (patch.approve === true) {
      // Validate against the body that will be stored, edit-in-same-call aware.
      const effectiveBody =
        patch.body_template !== undefined
          ? patch.body_template
          : existing.body_template;
      if (!effectiveBody.includes(PERSONAL_TOUCH_TOKEN)) {
        return fail(
          `Can't approve: the body must keep the ${PERSONAL_TOUCH_TOKEN} line — that's the one personal sentence written fresh for each recipient.`,
          422,
        );
      }
      update.status = "approved";
      update.approved_at = new Date().toISOString();
    }

    const updatedRes = await db
      .from("templates")
      .update(update)
      .eq("category", category)
      .select("*")
      .maybeSingle();
    if (updatedRes.error) return fail(updatedRes.error.message, 502);

    return ok(updatedRes.data as Template);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to update template.",
      500,
    );
  }
}
