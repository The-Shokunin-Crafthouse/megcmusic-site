/**
 * POST /api/outreach/send — machine-guarded.
 *
 * Sends one email via Gmail and records it. This route is the LAST line of
 * defense, not the only one — the weekly run is expected to pre-check, but the
 * route independently refuses (409) to send when the governing template isn't
 * approved, the prospect has opted out or replied negatively, or the same kind
 * was already sent this cycle. For `kind: initial` (and `reply`), the
 * governing template is the prospect's category row; for `kind: followup_N`
 * it's the global follow-up row for that kind (no category).
 *
 * Test mode ({ test_to, subject, body }) sends without touching the DB, for
 * run verification.
 */

import { appDb } from "@/lib/api/appDb";
import { sendEmail } from "@/lib/api/gmail";
import { fail, hasMachineSecret, ok, unauthorized } from "@/lib/outreach/http";
import type {
  MessageKind,
  Prospect,
  Template,
} from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

const VALID_KINDS: ReadonlySet<MessageKind> = new Set([
  "initial",
  "followup_1",
  "followup_2",
  "followup_3",
  "reply",
]);

const BLOCKED_STATUSES = new Set(["opted_out", "replied_negative"]);

interface SendBody {
  prospect_id?: unknown;
  subject?: unknown;
  body?: unknown;
  kind?: unknown;
  cycle?: unknown;
  new_thread?: unknown;
  test_to?: unknown;
}

/** Follow-up kinds carry their number in the suffix (followup_2 → 2). */
function followupNumber(kind: MessageKind): number | null {
  const match = /^followup_([123])$/.exec(kind);
  return match ? Number(match[1]) : null;
}

export async function POST(req: Request): Promise<Response> {
  if (!hasMachineSecret(req)) return unauthorized();

  const raw = (await req.json().catch(() => null)) as SendBody | null;
  if (!raw) return fail("Malformed request body.", 400);

  // --- Test mode: send, no DB writes -------------------------------------
  if (typeof raw.test_to === "string") {
    if (typeof raw.subject !== "string" || typeof raw.body !== "string") {
      return fail("test_to mode requires string subject and body.", 400);
    }
    try {
      const sent = await sendEmail({
        to: raw.test_to,
        subject: raw.subject,
        body: raw.body,
      });
      return ok({ test: true, ...sent });
    } catch (err) {
      return fail(
        err instanceof Error ? err.message : "Gmail send failed.",
        502,
      );
    }
  }

  // --- Real send ----------------------------------------------------------
  if (
    typeof raw.prospect_id !== "string" ||
    typeof raw.subject !== "string" ||
    typeof raw.body !== "string" ||
    typeof raw.kind !== "string" ||
    !VALID_KINDS.has(raw.kind as MessageKind) ||
    !Number.isInteger(raw.cycle)
  ) {
    return fail(
      "Send requires prospect_id, subject, body, a valid kind, and an integer cycle.",
      400,
    );
  }
  const kind = raw.kind as MessageKind;
  const cycle = raw.cycle as number;
  const newThread = raw.new_thread === true;

  try {
    const db = appDb();

    const prospectRes = await db
      .from("prospects")
      .select("*")
      .eq("id", raw.prospect_id)
      .maybeSingle();
    if (prospectRes.error) return fail(prospectRes.error.message, 502);
    const prospect = prospectRes.data as Prospect | null;
    if (!prospect) return fail("Prospect not found.", 404);

    if (BLOCKED_STATUSES.has(prospect.status)) {
      return fail(
        `Refusing to send: prospect status is "${prospect.status}".`,
        409,
      );
    }

    const followup = followupNumber(kind);
    const templateRes =
      followup !== null
        ? await db.from("templates").select("*").eq("kind", kind).maybeSingle()
        : await db
            .from("templates")
            .select("*")
            .eq("category", prospect.category)
            .eq("kind", "initial")
            .maybeSingle();
    if (templateRes.error) return fail(templateRes.error.message, 502);
    const template = templateRes.data as Template | null;
    if (!template || template.status !== "approved") {
      return fail(
        followup !== null
          ? `Refusing to send: follow-up template "${kind}" is not approved.`
          : `Refusing to send: template for "${prospect.category}" is not approved.`,
        409,
      );
    }

    // Duplicate-kind guard: never send the same kind twice in one cycle.
    const dupRes = await db
      .from("messages")
      .select("id")
      .eq("prospect_id", prospect.id)
      .eq("direction", "outbound")
      .eq("kind", kind)
      .eq("cycle", cycle)
      .limit(1);
    if (dupRes.error) return fail(dupRes.error.message, 502);
    if ((dupRes.data ?? []).length > 0) {
      return fail(
        `Refusing to send: "${kind}" already sent this cycle (${cycle}).`,
        409,
      );
    }

    // Follow-ups thread onto the existing conversation unless new_thread.
    const threadId =
      newThread || kind === "initial" ? null : prospect.gmail_thread_id;

    const sent = await sendEmail({
      to: prospect.email,
      subject: raw.subject,
      body: raw.body,
      threadId,
    });

    const now = new Date().toISOString();

    const insertRes = await db.from("messages").insert({
      prospect_id: prospect.id,
      direction: "outbound",
      kind,
      cycle,
      subject: raw.subject,
      body: raw.body,
      gmail_message_id: sent.gmailMessageId,
    });
    if (insertRes.error) return fail(insertRes.error.message, 502);

    const prospectUpdate: Record<string, unknown> = {
      status: "contacted",
      last_contacted_at: now,
      updated_at: now,
    };
    if (followup !== null) prospectUpdate.followups_sent = followup;
    // Record the thread id on the sends that open a thread.
    if (kind === "initial" || newThread || !prospect.gmail_thread_id) {
      prospectUpdate.gmail_thread_id = sent.gmailThreadId;
    }
    const updateRes = await db
      .from("prospects")
      .update(prospectUpdate)
      .eq("id", prospect.id);
    if (updateRes.error) return fail(updateRes.error.message, 502);

    return ok({ ...sent, prospect_id: prospect.id, kind, cycle });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Send failed.",
      502,
    );
  }
}
