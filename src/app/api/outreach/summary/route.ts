/**
 * GET /api/outreach/summary — page-facing (unguarded, logged decision).
 *
 * The UI-shaped read for the Booking Outreach tab: every template, the
 * needs-reply queue with a snippet of each latest inbound message, and the
 * pipeline split into its five buckets. The weekly run reads the leaner,
 * fuller /run-state route instead — this one stays shaped for the page.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/outreach/http";
import {
  CATEGORIES,
  type Message,
  type NeedsActionItem,
  type OutreachSummary,
  type PipelineBuckets,
  type Prospect,
  type Template,
} from "@/lib/outreach/types";

// Server route: it holds the service key, so it must never be statically
// prerendered with a build-time DB snapshot.
export const dynamic = "force-dynamic";

const SNIPPET_MAX = 200;

function snippetOf(body: string | null): string {
  const collapsed = (body ?? "").replace(/\s+/g, " ").trim();
  return collapsed.length > SNIPPET_MAX
    ? `${collapsed.slice(0, SNIPPET_MAX).trimEnd()}…`
    : collapsed;
}

function sortByCategory<T extends { category: string }>(rows: T[]): T[] {
  const order = new Map<string, number>(CATEGORIES.map((c, i) => [c, i]));
  return [...rows].sort(
    (a, b) =>
      (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99),
  );
}

export async function GET(): Promise<Response> {
  try {
    const db = appDb();

    const [templatesRes, prospectsRes] = await Promise.all([
      db.from("templates").select("*"),
      db.from("prospects").select("*").order("last_contacted_at", {
        ascending: false,
        nullsFirst: false,
      }),
    ]);

    if (templatesRes.error) return fail(templatesRes.error.message, 502);
    if (prospectsRes.error) return fail(prospectsRes.error.message, 502);

    const templates = sortByCategory((templatesRes.data ?? []) as Template[]);
    const prospects = (prospectsRes.data ?? []) as Prospect[];

    // Latest inbound message per needs-action prospect, in one query.
    const needsActionProspects = prospects.filter((p) => p.needs_action);
    const latestInboundByProspect = new Map<string, Message>();
    if (needsActionProspects.length > 0) {
      const ids = needsActionProspects.map((p) => p.id);
      const messagesRes = await db
        .from("messages")
        .select("*")
        .in("prospect_id", ids)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false });
      if (messagesRes.error) return fail(messagesRes.error.message, 502);
      for (const message of (messagesRes.data ?? []) as Message[]) {
        // Rows arrive newest-first, so the first seen per prospect is latest.
        if (!latestInboundByProspect.has(message.prospect_id)) {
          latestInboundByProspect.set(message.prospect_id, message);
        }
      }
    }

    const needsAction: NeedsActionItem[] = needsActionProspects.map(
      (prospect) => {
        const message = latestInboundByProspect.get(prospect.id);
        return {
          prospect,
          latestInbound: message
            ? {
                id: message.id,
                subject: message.subject,
                snippet: snippetOf(message.body),
                created_at: message.created_at,
              }
            : null,
        };
      },
    );

    const pipeline: PipelineBuckets = {
      replied_positive: prospects.filter(
        (p) => p.status === "replied_positive",
      ),
      replied_negative: prospects.filter(
        (p) => p.status === "replied_negative",
      ),
      in_sequence: prospects.filter((p) => p.status === "contacted"),
      new: prospects.filter((p) => p.status === "new"),
      cooling: prospects.filter((p) => p.status === "cooling"),
    };

    const summary: OutreachSummary = { templates, needsAction, pipeline };
    return ok(summary);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to load outreach summary.",
      500,
    );
  }
}
