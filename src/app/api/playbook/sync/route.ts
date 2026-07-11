/**
 * GET /api/playbook/sync — daily cron (vercel.json), guarded by CRON_SECRET.
 *
 * Discovers all IG media, upserts into sp_posts (caption/permalink/thumbnail
 * refreshed every run — Meta CDN thumbnail URLs expire), then refreshes
 * metrics for the active window (posted in the last 90 days, or never
 * synced). A single media's insights failure is logged and the sync moves
 * on (PLAN.md §3 step 5); a failed discovery page aborts the whole run,
 * since a broken discovery means the sync can't trust it has seen every
 * post. An OAuth 190 (token revoked/rotated) is the one failure mode the
 * non-expiring System User token has — it's surfaced as `auth_error` plus a
 * one-line alert email, distinct from a transient `error` the next day's
 * cron self-heals.
 */

import { appDb } from "@/lib/api/appDb";
import { sendEmail } from "@/lib/api/gmail";
import { fail, hasCronSecret, ok, unauthorized } from "@/lib/playbook/http";
import {
  discoverAllMedia,
  displayThumbnail,
  getMediaInsights,
  isAuthError,
  type DiscoveredMedia,
} from "@/lib/playbook/meta";
import type { ProductType } from "@/lib/playbook/types";

export const dynamic = "force-dynamic";

const ACTIVE_WINDOW_DAYS = 90;
const SYNCED_PRODUCT_TYPES = new Set<ProductType>(["FEED", "REELS"]);
const ALERT_EMAIL = process.env.BOOKING_TO ?? "meghanclarisse@gmail.com";

function isSyncedProductType(value: string): value is ProductType {
  return SYNCED_PRODUCT_TYPES.has(value as ProductType);
}

async function alertAuthError(detail: string): Promise<void> {
  try {
    await sendEmail({
      to: ALERT_EMAIL,
      subject: "Social Playbook — Instagram connection needs attention",
      body: `The daily Instagram sync hit an authorization error and has paused:\n\n${detail}\n\nThe System User token may have been revoked or rotated in Meta Business Settings. Regenerate it and update META_SYSTEM_USER_TOKEN in Vercel.`,
    });
  } catch {
    // The sync's own failure is the real signal; a failed alert email
    // shouldn't mask it or crash the run.
  }
}

export async function GET(req: Request): Promise<Response> {
  if (!hasCronSecret(req)) return unauthorized();

  const db = appDb();
  const startedAt = new Date().toISOString();

  const runInsert = await db
    .from("sp_sync_runs")
    .insert({ kind: "sync", status: "ok", started_at: startedAt })
    .select("id")
    .single();
  if (runInsert.error) return fail(runInsert.error.message, 502);
  const runId = runInsert.data.id as number;

  let media: DiscoveredMedia[];
  try {
    media = await discoverAllMedia();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Discovery failed.";
    const authError = isAuthError(err);
    await db
      .from("sp_sync_runs")
      .update({
        status: authError ? "auth_error" : "error",
        detail: message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    if (authError) await alertAuthError(message);
    return fail(message, 502);
  }

  const upsertRows = media.map((item) => ({
    id: item.id,
    platform: "instagram" as const,
    media_type: item.media_type,
    product_type: item.media_product_type,
    caption: item.caption,
    permalink: item.permalink,
    thumbnail_url: displayThumbnail(item),
    posted_at: item.timestamp,
  }));
  if (upsertRows.length > 0) {
    const upsertRes = await db
      .from("sp_posts")
      .upsert(upsertRows, { onConflict: "id" });
    if (upsertRes.error) {
      await db
        .from("sp_sync_runs")
        .update({
          status: "error",
          detail: upsertRes.error.message,
          finished_at: new Date().toISOString(),
        })
        .eq("id", runId);
      return fail(upsertRes.error.message, 502);
    }
  }

  const activeCutoff = new Date(
    Date.now() - ACTIVE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const activeRes = await db
    .from("sp_posts")
    .select("id, product_type, posted_at, metrics_synced_at")
    .or(`posted_at.gt.${activeCutoff},metrics_synced_at.is.null`);
  if (activeRes.error) {
    await db
      .from("sp_sync_runs")
      .update({
        status: "error",
        detail: activeRes.error.message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return fail(activeRes.error.message, 502);
  }

  let synced = 0;
  let skipped = 0;
  let failed = 0;
  let authErrorSeen = false;
  const errorDetails: string[] = [];

  for (const post of activeRes.data ?? []) {
    if (!isSyncedProductType(post.product_type as string)) {
      skipped++;
      continue;
    }
    try {
      const insights = await getMediaInsights(
        post.id as string,
        post.product_type as string,
      );
      if (!insights) {
        skipped++;
        continue;
      }
      const syncedAt = new Date().toISOString();
      const updateRes = await db
        .from("sp_posts")
        .update({ ...insights, metrics_synced_at: syncedAt })
        .eq("id", post.id);
      if (updateRes.error) throw new Error(updateRes.error.message);
      const snapshotRes = await db
        .from("sp_metric_snapshots")
        .insert({ post_id: post.id, captured_at: syncedAt, ...insights });
      if (snapshotRes.error) throw new Error(snapshotRes.error.message);
      synced++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : "Insights fetch failed.";
      if (isAuthError(err)) authErrorSeen = true;
      errorDetails.push(`${post.id}: ${message}`);
    }
  }

  const detail = `discovered=${media.length} synced=${synced} skipped=${skipped} failed=${failed}${
    errorDetails.length > 0 ? ` | ${errorDetails.slice(0, 5).join("; ")}` : ""
  }`;
  const status = authErrorSeen ? "auth_error" : "ok";
  await db
    .from("sp_sync_runs")
    .update({ status, detail, finished_at: new Date().toISOString() })
    .eq("id", runId);
  if (authErrorSeen) await alertAuthError(detail);

  return ok({ status, detail });
}
