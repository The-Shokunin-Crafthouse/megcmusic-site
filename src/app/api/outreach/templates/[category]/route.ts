/**
 * PATCH /api/outreach/templates/[category] — page-facing (unguarded).
 *
 * The dynamic segment is named `category` for history (see PR #44), but it
 * accepts either a category slug (initial template) or a follow-up kind
 * (followup_1/2/3, global) — destructured below as `key` to reflect that.
 * Approval
 * authorizes the weekly run to send from this template without per-draft
 * review:
 *   - Initial templates: refused (422) unless the effective body still
 *     contains {{PERSONAL_TOUCH}}. Editing an already-approved initial does
 *     NOT reset its approval — the weekly run always uses the latest copy.
 *   - Follow-up templates: no {{PERSONAL_TOUCH}} requirement. Editing an
 *     already-approved follow-up DOES reset it to pending — unlike initials,
 *     follow-up copy is fixed (no per-prospect research pass), so a content
 *     change needs a fresh look before the automation can send it again.
 * Every save (any kind) is blocked (422) if the incoming subject/body/
 * signature contains an em dash or en dash — Meg's copy rule, validation
 * only, never auto-rewritten.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/outreach/http";
import {
  isCategory,
  isFollowupKind,
  PERSONAL_TOUCH_TOKEN,
  type Template,
} from "@/lib/outreach/types";
import { bannedDashFields } from "@/lib/outreach/voiceGuard";

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
    const { category: key } = await ctx.params;
    const isInitial = isCategory(key);
    const isFollowup = isFollowupKind(key);
    if (!isInitial && !isFollowup) {
      return fail(`Unknown template "${key}".`, 404);
    }

    const patch = parseBody(await req.json().catch(() => null));
    if (!patch) return fail("Malformed request body.", 400);

    if (isFollowup && patch.subject_template !== undefined) {
      return fail(
        "Follow-up templates have no subject — they thread onto the original message.",
        400,
      );
    }

    const dashHits = bannedDashFields({
      subject_template: patch.subject_template,
      body_template: patch.body_template,
      signature: patch.signature,
    });
    if (dashHits.length > 0) {
      return fail(
        `Can't save: ${dashHits.join(", ")} contains an em dash (—) or en dash (–) — Meg's copy rule bans both. Rewrite without one.`,
        422,
      );
    }

    const db = appDb();

    const existingRes = await db
      .from("templates")
      .select("*")
      .eq(isInitial ? "category" : "kind", key)
      .eq("kind", isInitial ? "initial" : key)
      .maybeSingle();
    if (existingRes.error) return fail(existingRes.error.message, 502);
    const existing = existingRes.data as Template | null;
    if (!existing) return fail(`No template for "${key}".`, 404);

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

    const isContentEdit =
      patch.subject_template !== undefined ||
      patch.body_template !== undefined ||
      patch.signature !== undefined;

    if (patch.approve === true) {
      if (isInitial) {
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
      }
      update.status = "approved";
      update.approved_at = new Date().toISOString();
    } else if (isFollowup && isContentEdit) {
      // Follow-up copy is fixed (no per-prospect research pass) — an edit
      // needs a fresh look before the automation can send it again.
      update.status = "pending";
      update.approved_at = null;
    }

    const updatedRes = await db
      .from("templates")
      .update(update)
      .eq("id", existing.id)
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
