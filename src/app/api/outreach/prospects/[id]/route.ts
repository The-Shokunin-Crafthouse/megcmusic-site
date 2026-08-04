/**
 * /api/outreach/prospects/[id]
 *
 * GET — page-facing (unguarded, same posture as GET /api/outreach/summary):
 *   the full prospect row plus its message history (newest-first, capped at
 *   50) for the Booking venue-detail sheet.
 *
 * PATCH — one route, two callers, field-level guard.
 *   Meg's page (no secret):  only { needs_action } — the "Mark handled" button.
 *                            Any other field in the body → 403.
 *   Weekly run (x-outreach-secret): additionally status, cooling_until, cycle,
 *                            followups_sent, research_notes — opt-outs, cooling,
 *                            and cycle restarts.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, hasMachineSecret, ok } from "@/lib/outreach/http";
import type { Message, Prospect, ProspectStatus } from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await ctx.params;
    if (!UUID_RE.test(id)) {
      return fail(`"${id}" is not a valid prospect id.`, 400);
    }

    const db = appDb();
    const prospectRes = await db
      .from("prospects")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (prospectRes.error) return fail(prospectRes.error.message, 502);
    if (!prospectRes.data) return fail(`No prospect with id "${id}".`, 404);

    const messagesRes = await db
      .from("messages")
      .select("*")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false })
      .range(0, 49);
    if (messagesRes.error) return fail(messagesRes.error.message, 502);

    return ok({
      prospect: prospectRes.data as Prospect,
      messages: (messagesRes.data ?? []) as Message[],
    });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to load prospect.",
      500,
    );
  }
}

const PAGE_FIELDS = ["needs_action"] as const;
const MACHINE_FIELDS = [
  "needs_action",
  "status",
  "cooling_until",
  "cycle",
  "followups_sent",
  "research_notes",
  "cc_email",
] as const;

const VALID_STATUS: ReadonlySet<ProspectStatus> = new Set([
  "new",
  "contacted",
  "replied_positive",
  "replied_negative",
  "opted_out",
  "cooling",
]);

function validateField(key: string, value: unknown): string | null {
  switch (key) {
    case "needs_action":
      return typeof value === "boolean" ? null : "needs_action must be boolean";
    case "status":
      return typeof value === "string" && VALID_STATUS.has(value as ProspectStatus)
        ? null
        : "status is not a valid prospect status";
    case "cooling_until":
      return value === null ||
        (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
        ? null
        : "cooling_until must be a YYYY-MM-DD date or null";
    case "cycle":
      return Number.isInteger(value) && (value as number) >= 1
        ? null
        : "cycle must be an integer ≥ 1";
    case "followups_sent":
      return Number.isInteger(value) &&
        (value as number) >= 0 &&
        (value as number) <= 3
        ? null
        : "followups_sent must be an integer 0–3";
    case "research_notes":
      return value === null || typeof value === "string"
        ? null
        : "research_notes must be a string or null";
    case "cc_email":
      return value === null || typeof value === "string"
        ? null
        : "cc_email must be a string or null";
    default:
      return "unknown field";
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await ctx.params;
    const raw = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (typeof raw !== "object" || raw === null) {
      return fail("Malformed request body.", 400);
    }

    const isMachine = hasMachineSecret(req);
    const allowed = new Set<string>(isMachine ? MACHINE_FIELDS : PAGE_FIELDS);

    const keys = Object.keys(raw);
    if (keys.length === 0) return fail("No fields to update.", 400);

    for (const key of keys) {
      if (!allowed.has(key)) {
        // The page may only ever touch needs_action; anything else is refused
        // even to read, so an un-secreted caller can't widen its own scope.
        return isMachine
          ? fail(`Field "${key}" is not updatable.`, 400)
          : fail(
              `Field "${key}" requires the machine secret. The page may only set needs_action.`,
              403,
            );
      }
      const problem = validateField(key, raw[key]);
      if (problem) return fail(problem, 400);
    }

    const update: Record<string, unknown> = {
      ...raw,
      updated_at: new Date().toISOString(),
    };

    const db = appDb();
    const updatedRes = await db
      .from("prospects")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (updatedRes.error) return fail(updatedRes.error.message, 502);
    if (!updatedRes.data) return fail(`No prospect with id "${id}".`, 404);

    return ok(updatedRes.data as Prospect);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to update prospect.",
      500,
    );
  }
}
