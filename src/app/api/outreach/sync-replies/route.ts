/**
 * POST /api/outreach/sync-replies — machine-guarded.
 *
 * For every prospect with a Gmail thread (and not opted out), fetch the thread
 * and insert any inbound messages not already stored (deduped on
 * gmail_message_id), with sentiment=null. It does NOT classify — the weekly run
 * reads these back, classifies, and PATCHes each via /messages/[id]. Returns
 * the newly-inserted inbound messages.
 */

import { appDb } from "@/lib/api/appDb";
import { fetchThreadMessages } from "@/lib/api/gmail";
import { fail, hasMachineSecret, ok, unauthorized } from "@/lib/outreach/http";
import type { Prospect } from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  if (!hasMachineSecret(req)) return unauthorized();

  try {
    const db = appDb();

    const prospectsRes = await db
      .from("prospects")
      .select("*")
      .not("gmail_thread_id", "is", null)
      .neq("status", "opted_out");
    if (prospectsRes.error) return fail(prospectsRes.error.message, 502);
    const prospects = (prospectsRes.data ?? []) as Prospect[];

    const candidates: {
      prospect_id: string;
      cycle: number;
      subject: string | null;
      body: string;
      gmail_message_id: string;
    }[] = [];
    const threadErrors: { prospect_id: string; error: string }[] = [];

    for (const prospect of prospects) {
      if (!prospect.gmail_thread_id) continue;
      try {
        const messages = await fetchThreadMessages(prospect.gmail_thread_id);
        for (const message of messages) {
          if (!message.isInbound || !message.gmailMessageId) continue;
          candidates.push({
            prospect_id: prospect.id,
            cycle: prospect.cycle,
            subject: message.subject,
            body: message.body,
            gmail_message_id: message.gmailMessageId,
          });
        }
      } catch (err) {
        threadErrors.push({
          prospect_id: prospect.id,
          error: err instanceof Error ? err.message : "thread fetch failed",
        });
      }
    }

    // Dedupe against already-stored messages in one query.
    let inserted: unknown[] = [];
    if (candidates.length > 0) {
      const ids = candidates.map((c) => c.gmail_message_id);
      const existingRes = await db
        .from("messages")
        .select("gmail_message_id")
        .in("gmail_message_id", ids);
      if (existingRes.error) return fail(existingRes.error.message, 502);
      const existing = new Set(
        (existingRes.data ?? []).map((r) => r.gmail_message_id as string),
      );

      const fresh = candidates.filter(
        (c) => !existing.has(c.gmail_message_id),
      );
      if (fresh.length > 0) {
        const insertRes = await db
          .from("messages")
          .insert(
            fresh.map((c) => ({
              ...c,
              direction: "inbound",
              kind: "reply",
              sentiment: null,
            })),
          )
          .select("*");
        if (insertRes.error) return fail(insertRes.error.message, 502);
        inserted = insertRes.data ?? [];
      }
    }

    return ok({ inserted, threadErrors });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Sync failed.",
      500,
    );
  }
}
