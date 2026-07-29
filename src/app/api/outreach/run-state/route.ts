/**
 * GET /api/outreach/run-state — machine-guarded.
 *
 * The weekly run's read surface: full prospect rows (all schema fields) for the
 * statuses it acts on — new, contacted, cooling — each with a count of inbound
 * messages received in that prospect's current cycle, plus the current global
 * follow-up templates (kind/body/signature/status) so the automation always
 * builds follow-ups from the latest approved copy rather than a stale
 * snapshot. The page's /summary route stays UI-shaped; this one is complete
 * and lean for the automation.
 */

import { appDb, chunkIds, fetchAllPages } from "@/lib/api/appDb";
import { fail, hasMachineSecret, ok, unauthorized } from "@/lib/outreach/http";
import type { Message, Prospect, Template } from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

const ACTIONABLE_STATUSES = ["new", "contacted", "cooling"];

/** The three message columns the inbound-per-cycle count needs. */
type InboundCycleRow = Pick<Message, "prospect_id" | "cycle" | "direction">;

export async function GET(req: Request): Promise<Response> {
  if (!hasMachineSecret(req)) return unauthorized();

  try {
    const db = appDb();

    // Paged: this is the automation's work list, so a silent 1000-row cap
    // would mean prospects never get contacted or followed up at all.
    const prospectsRes = await fetchAllPages<Prospect>((from, to) =>
      db
        .from("prospects")
        .select("*")
        .in("status", ACTIONABLE_STATUSES)
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (prospectsRes.error) return fail(prospectsRes.error.message, 502);
    const prospects = prospectsRes.rows;

    // Inbound counts for the current cycle. This spans every inbound message
    // for every actionable prospect, so it crosses 1000 well before the
    // pipeline does — undercounting here would send a follow-up to someone who
    // already replied. Chunked by id (URL length) and paged within each chunk.
    const cycleByProspect = new Map(prospects.map((p) => [p.id, p.cycle]));
    const inboundThisCycle = new Map<string, number>();
    for (const ids of chunkIds([...cycleByProspect.keys()])) {
      const messagesRes = await fetchAllPages<InboundCycleRow>((from, to) =>
        db
          .from("messages")
          .select("prospect_id, cycle, direction")
          .in("prospect_id", ids)
          .eq("direction", "inbound")
          .order("id", { ascending: true })
          .range(from, to),
      );
      if (messagesRes.error) return fail(messagesRes.error.message, 502);
      for (const message of messagesRes.rows) {
        const pid = message.prospect_id;
        if (message.cycle === cycleByProspect.get(pid)) {
          inboundThisCycle.set(pid, (inboundThisCycle.get(pid) ?? 0) + 1);
        }
      }
    }

    const rows = prospects.map((prospect) => ({
      ...prospect,
      inbound_this_cycle: inboundThisCycle.get(prospect.id) ?? 0,
    }));

    const followupTemplatesRes = await db
      .from("templates")
      .select("kind, body_template, signature, status")
      .neq("kind", "initial");
    if (followupTemplatesRes.error) {
      return fail(followupTemplatesRes.error.message, 502);
    }
    const followupTemplates = (
      (followupTemplatesRes.data ?? []) as Pick<
        Template,
        "kind" | "body_template" | "signature" | "status"
      >[]
    ).map((t) => ({
      kind: t.kind,
      body: t.body_template,
      signature: t.signature,
      status: t.status,
    }));

    return ok({ prospects: rows, followupTemplates });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to load run state.",
      500,
    );
  }
}
