/**
 * GET /api/outreach/summary — page-facing (unguarded, logged decision).
 *
 * The UI-shaped read for the Booking Outreach tab: every template, the
 * needs-reply queue with a snippet of each latest inbound message, and the
 * pipeline split into its five buckets. The weekly run reads the leaner,
 * fuller /run-state route instead — this one stays shaped for the page.
 */

import { appDb, chunkIds, fetchAllPages } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/outreach/http";
import {
  CATEGORIES,
  FOLLOWUP_KINDS,
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

// Initials sort in category order; the three global follow-ups sort after,
// in kind order (followup_1, 2, 3).
function sortTemplates(rows: Template[]): Template[] {
  const order = new Map<string, number>([
    ...CATEGORIES.map((c, i): [string, number] => [c, i]),
    ...FOLLOWUP_KINDS.map((k, i): [string, number] => [k, CATEGORIES.length + i]),
  ]);
  const keyOf = (t: Template) => (t.kind === "initial" ? (t.category ?? "") : t.kind);
  return [...rows].sort((a, b) => (order.get(keyOf(a)) ?? 99) - (order.get(keyOf(b)) ?? 99));
}

export async function GET(): Promise<Response> {
  try {
    const db = appDb();

    const [templatesRes, prospectsRes] = await Promise.all([
      // Unpaged deliberately: `templates` is fixed at one initial per category
      // plus the three global follow-ups (9 rows), so it can never approach
      // the 1000-row page ceiling.
      db.from("templates").select("*"),
      // Paged to exhaustion — the whole pipeline (and the Booking screen's
      // category list and counts, which derive from it) must be complete, and
      // the show-pipeline automation adds prospects continuously. `id` is the
      // tiebreaker: `last_contacted_at` is null for every uncontacted row, so
      // without it the page boundary is not deterministic.
      fetchAllPages<Prospect>((from, to) =>
        db
          .from("prospects")
          .select("*")
          .order("last_contacted_at", { ascending: false, nullsFirst: false })
          .order("id", { ascending: true })
          .range(from, to),
      ),
    ]);

    if (templatesRes.error) return fail(templatesRes.error.message, 502);
    if (prospectsRes.error) return fail(prospectsRes.error.message, 502);

    const templates = sortTemplates((templatesRes.data ?? []) as Template[]);
    const prospects = prospectsRes.rows;

    // Latest inbound message per needs-action prospect, in one query.
    const needsActionProspects = prospects.filter((p) => p.needs_action);
    const latestInboundByProspect = new Map<string, Message>();
    if (needsActionProspects.length > 0) {
      // Two ceilings, not one (studio learning #170). Paging fixes how many
      // rows come back: this spans every inbound message ever received by every
      // needs-action prospect, so it crosses 1000 well before the pipeline
      // does, and a truncated first page silently drops the snippet from the
      // tail of the needs-reply queue. Chunking fixes how the request goes out:
      // PostgREST puts `.in()` in the query string at ~39 bytes per quoted
      // uuid, so a few hundred ids reach the 8KB request-line limit and 414.
      // Same shape as /run-state — chunked by id, paged within each chunk.
      for (const ids of chunkIds(needsActionProspects.map((p) => p.id))) {
        const messagesRes = await fetchAllPages<Message>((from, to) =>
          db
            .from("messages")
            .select("*")
            .in("prospect_id", ids)
            .eq("direction", "inbound")
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, to),
        );
        if (messagesRes.error) return fail(messagesRes.error.message, 502);
        for (const message of messagesRes.rows) {
          // Rows arrive newest-first, so the first seen per prospect is latest.
          if (!latestInboundByProspect.has(message.prospect_id)) {
            latestInboundByProspect.set(message.prospect_id, message);
          }
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

    // Five buckets, exactly as the sprint-08 contract specifies them. The
    // sixth status, `opted_out`, has no bucket by design: it is the permanent
    // do-not-contact state (the send route blocks it, sync-replies skips it),
    // so those rows drop out of the Booking screen entirely rather than
    // sitting in a list Meg can act on. Adding a status means adding a bucket
    // here — anything unbucketed disappears from the UI with no signal.
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
