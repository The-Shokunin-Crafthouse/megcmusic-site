/**
 * GET /api/playbook/recommendation — page-facing (unguarded).
 *
 * Home's "Your Next Post" + weekly plan. Deterministic per America/Denver
 * calendar day (see src/lib/playbook/recommend.ts) so it's stable across
 * every fetch today and changes at midnight — never blocked on the
 * generation daemon. The only DB read is the single most recently posted
 * `sp_posts` row, used to steer the pick away from Meghan's last format.
 * Explicit `no-store` (in addition to `revalidate = 0`) since a
 * per-calendar-day-deterministic response has nothing useful to cache
 * between requests anyway.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";
import { buildRecommendation } from "@/lib/playbook/recommend";
import type { ProductType } from "@/lib/playbook/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<Response> {
  try {
    const db = appDb();
    const latestRes = await db
      .from("sp_posts")
      .select("product_type")
      .order("posted_at", { ascending: false })
      .limit(1);
    if (latestRes.error) return fail(latestRes.error.message, 502);

    const latestProductType =
      (latestRes.data?.[0]?.product_type as ProductType | undefined) ?? null;

    const recommendation = buildRecommendation({ latestProductType });

    const res = ok(recommendation);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to build recommendation.",
      500,
    );
  }
}
