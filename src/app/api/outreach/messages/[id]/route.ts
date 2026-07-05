/**
 * PATCH /api/outreach/messages/[id] — machine-guarded.
 *
 * The weekly run's classification write. Sets an inbound message's sentiment
 * and cascades to its prospect:
 *   positive → status replied_positive, needs_action true  (Meg must reply)
 *   negative → status replied_negative, needs_action false (terminal, robot out)
 *   neutral  → prospect untouched
 */

import { outreachDb } from "@/lib/api/outreachDb";
import { fail, hasMachineSecret, ok, unauthorized } from "@/lib/outreach/http";
import type { Message, Sentiment } from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

const VALID_SENTIMENT: ReadonlySet<Sentiment> = new Set([
  "positive",
  "negative",
  "neutral",
]);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!hasMachineSecret(req)) return unauthorized();

  try {
    const { id } = await ctx.params;
    const raw = (await req.json().catch(() => null)) as {
      sentiment?: unknown;
    } | null;
    if (
      !raw ||
      typeof raw.sentiment !== "string" ||
      !VALID_SENTIMENT.has(raw.sentiment as Sentiment)
    ) {
      return fail("sentiment must be positive, negative, or neutral.", 400);
    }
    const sentiment = raw.sentiment as Sentiment;

    const db = outreachDb();

    const updatedRes = await db
      .from("messages")
      .update({ sentiment })
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (updatedRes.error) return fail(updatedRes.error.message, 502);
    const message = updatedRes.data as Message | null;
    if (!message) return fail(`No message with id "${id}".`, 404);

    // Cascade to the prospect (neutral leaves it untouched).
    if (sentiment !== "neutral") {
      const prospectUpdate =
        sentiment === "positive"
          ? { status: "replied_positive", needs_action: true }
          : { status: "replied_negative", needs_action: false };
      const cascadeRes = await db
        .from("prospects")
        .update({ ...prospectUpdate, updated_at: new Date().toISOString() })
        .eq("id", message.prospect_id);
      if (cascadeRes.error) return fail(cascadeRes.error.message, 502);
    }

    return ok(message);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to set sentiment.",
      500,
    );
  }
}
