/**
 * /api/playbook/checklist — page-facing (unguarded).
 *
 * Per-day check-off persistence for the Checklist screen (`checklist_state`,
 * PK `(day, item_id)`) — survives reinstall, unlike localStorage (PLAN.md
 * §3.4). `date` is always validated against a strict `YYYY-MM-DD` regex
 * before touching it (repo learning #48 — never `new Date(bareNumber)`).
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";

export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date");
    if (!date || !DATE_RE.test(date)) {
      return fail('"date" must be a YYYY-MM-DD string.', 400);
    }

    const db = appDb();
    const rowsRes = await db
      .from("checklist_state")
      .select("item_id, checked")
      .eq("day", date);
    if (rowsRes.error) return fail(rowsRes.error.message, 502);

    const items: Record<string, boolean> = {};
    for (const row of rowsRes.data ?? []) {
      items[row.item_id as string] = row.checked as boolean;
    }

    return ok({ items });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to load checklist state.",
      500,
    );
  }
}

interface PutBody {
  date: string;
  itemId: string;
  checked: boolean;
}

function parseBody(raw: unknown): PutBody | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as Record<string, unknown>;
  if (typeof body.date !== "string" || !DATE_RE.test(body.date)) return null;
  if (typeof body.itemId !== "string" || body.itemId.trim().length === 0) {
    return null;
  }
  if (typeof body.checked !== "boolean") return null;
  return { date: body.date, itemId: body.itemId, checked: body.checked };
}

export async function PUT(req: Request): Promise<Response> {
  try {
    const raw = await req.json().catch(() => null);
    const body = parseBody(raw);
    if (!body) {
      return fail(
        'Body must be { date: "YYYY-MM-DD", itemId: string, checked: boolean }.',
        400,
      );
    }

    const db = appDb();
    const upsertRes = await db
      .from("checklist_state")
      .upsert(
        {
          day: body.date,
          item_id: body.itemId,
          checked: body.checked,
          checked_at: body.checked ? new Date().toISOString() : null,
        },
        { onConflict: "day,item_id" },
      )
      .select("item_id, checked")
      .single();
    if (upsertRes.error) return fail(upsertRes.error.message, 502);

    return ok(upsertRes.data);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to update checklist state.",
      500,
    );
  }
}
