/**
 * One-time backfill — pages the entire IG media history, fetches insights
 * for every post (not just the 90-day window the daily sync covers), and
 * marks metrics_available=false where Meta refuses insights permanently
 * (media predating the account's business conversion). Run once before the
 * dashboard ships; logged as an sp_sync_runs row (kind:'backfill').
 *
 *   npm run playbook:backfill
 *   # → node --env-file=.env.local --import tsx scripts/playbook-backfill.ts
 */
import { appDb } from "../src/lib/api/appDb";
import {
  discoverAllMedia,
  displayThumbnail,
  getMediaInsights,
  isAuthError,
  isPreBusinessMediaError,
} from "../src/lib/playbook/meta";

const SYNCED_PRODUCT_TYPES = new Set(["FEED", "REELS"]);

async function main(): Promise<void> {
  const db = appDb();
  const startedAt = new Date().toISOString();

  const runInsert = await db
    .from("sp_sync_runs")
    .insert({ kind: "backfill", status: "ok", started_at: startedAt })
    .select("id")
    .single();
  if (runInsert.error) throw new Error(runInsert.error.message);
  const runId = runInsert.data.id as number;

  console.log("Discovering media...");
  const media = await discoverAllMedia();
  console.log(`Found ${media.length} media items.`);

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
  const upsertRes = await db
    .from("sp_posts")
    .upsert(upsertRows, { onConflict: "id" });
  if (upsertRes.error) throw new Error(upsertRes.error.message);

  let synced = 0;
  let unavailable = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of media) {
    if (!SYNCED_PRODUCT_TYPES.has(item.media_product_type)) {
      skipped++;
      continue;
    }
    try {
      const insights = await getMediaInsights(
        item.id,
        item.media_product_type,
      );
      if (!insights) {
        skipped++;
        continue;
      }
      const syncedAt = new Date().toISOString();
      const updateRes = await db
        .from("sp_posts")
        .update({
          ...insights,
          metrics_synced_at: syncedAt,
          metrics_available: true,
        })
        .eq("id", item.id);
      if (updateRes.error) throw new Error(updateRes.error.message);
      const snapshotRes = await db
        .from("sp_metric_snapshots")
        .insert({ post_id: item.id, captured_at: syncedAt, ...insights });
      if (snapshotRes.error) throw new Error(snapshotRes.error.message);
      synced++;
      console.log(`✓ ${item.id} (${item.media_product_type})`);
    } catch (err) {
      // A 190 aborts the whole backfill — retrying won't help until the
      // token is fixed. Confirmed-permanent (subcode 2108006, "posted before
      // business conversion") gets marked once, never retried. Anything else
      // is a real, possibly-transient failure — log it and leave
      // metrics_available untouched so the next run retries this media.
      if (isAuthError(err)) throw err;
      if (isPreBusinessMediaError(err)) {
        const markRes = await db
          .from("sp_posts")
          .update({ metrics_available: false })
          .eq("id", item.id);
        if (markRes.error) throw new Error(markRes.error.message);
        unavailable++;
        console.log(`– ${item.id} marked metrics_available=false (pre-business-conversion media)`);
        continue;
      }
      failed++;
      console.error(`✗ ${item.id}:`, err instanceof Error ? err.message : err);
    }
  }

  const detail = `discovered=${media.length} synced=${synced} unavailable=${unavailable} skipped=${skipped} failed=${failed}`;
  await db
    .from("sp_sync_runs")
    .update({ status: "ok", detail, finished_at: new Date().toISOString() })
    .eq("id", runId);
  console.log(detail);
}

main().catch((err) => {
  console.error("✗ Backfill failed:", err);
  process.exit(1);
});
