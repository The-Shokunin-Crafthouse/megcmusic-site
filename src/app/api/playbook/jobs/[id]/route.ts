/**
 * GET /api/playbook/jobs/[id] — page-facing (unguarded, same posture as
 * jobs/route.ts). Polled by the creation flow (fallback path when Supabase
 * Realtime isn't available, capped at 2min per repo learning #68) while a
 * job is `queued`/`running`/`streaming`.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";
import type { GenerationJob } from "@/lib/playbook/types";

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
      return fail(`"${id}" is not a valid job id.`, 400);
    }

    const db = appDb();
    const jobRes = await db
      .from("generation_jobs")
      .select("id, kind, status, output, error, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (jobRes.error) return fail(jobRes.error.message, 502);
    if (!jobRes.data) return fail(`No job with id "${id}".`, 404);

    const row = jobRes.data as Pick<
      GenerationJob,
      "id" | "kind" | "status" | "output" | "error"
    > & { created_at: string; updated_at: string };

    return ok({
      id: row.id,
      kind: row.kind,
      status: row.status,
      output: row.output,
      error: row.error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to load job.",
      500,
    );
  }
}
