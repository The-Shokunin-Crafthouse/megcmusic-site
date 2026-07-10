/**
 * GET /api/outreach/run-state — machine-guarded.
 *
 * The weekly run's read surface: full prospect rows (all schema fields) for the
 * statuses it acts on — new, contacted, cooling — each with a count of inbound
 * messages received in that prospect's current cycle. The page's /summary route
 * stays UI-shaped; this one is complete and lean for the automation.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, hasMachineSecret, ok, unauthorized } from "@/lib/outreach/http";
import type { Prospect } from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

const ACTIONABLE_STATUSES = ["new", "contacted", "cooling"];

export async function GET(req: Request): Promise<Response> {
  if (!hasMachineSecret(req)) return unauthorized();

  try {
    const db = appDb();

    const prospectsRes = await db
      .from("prospects")
      .select("*")
      .in("status", ACTIONABLE_STATUSES);
    if (prospectsRes.error) return fail(prospectsRes.error.message, 502);
    const prospects = (prospectsRes.data ?? []) as Prospect[];

    // Inbound counts for the current cycle, one query over the relevant ids.
    const cycleByProspect = new Map(prospects.map((p) => [p.id, p.cycle]));
    const inboundThisCycle = new Map<string, number>();
    if (prospects.length > 0) {
      const messagesRes = await db
        .from("messages")
        .select("prospect_id, cycle, direction")
        .in("prospect_id", [...cycleByProspect.keys()])
        .eq("direction", "inbound");
      if (messagesRes.error) return fail(messagesRes.error.message, 502);
      for (const message of messagesRes.data ?? []) {
        const pid = message.prospect_id as string;
        if (message.cycle === cycleByProspect.get(pid)) {
          inboundThisCycle.set(pid, (inboundThisCycle.get(pid) ?? 0) + 1);
        }
      }
    }

    const rows = prospects.map((prospect) => ({
      ...prospect,
      inbound_this_cycle: inboundThisCycle.get(prospect.id) ?? 0,
    }));

    return ok({ prospects: rows });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to load run state.",
      500,
    );
  }
}
