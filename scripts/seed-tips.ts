/**
 * Seed the `tips` table from the reviewed per-surface JSON files in
 * scripts/tips-seed/ (Fable-authored, Sprint 10 — one file per surface,
 * every tip readable in review before it ever serves).
 *
 *   npm run playbook:seed-tips
 *   # → node --env-file=.env.local --import tsx scripts/seed-tips.ts
 *
 * Refuses to run if seed rows already exist (the library grows via the
 * daemon's tip_derivation jobs after launch — re-seeding would duplicate).
 * Pass --force to seed anyway (e.g. after a manual truncate).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { appDb } from "../src/lib/api/appDb";
import { TIP_SURFACES, type TipSurface } from "../src/lib/playbook/generation";

const SEED_FILES: Record<TipSurface, string> = {
  daily_insight: "daily-insight.json",
  booking_insight: "booking-insight.json",
  stat_insight: "stat-insight.json",
  why_this_works: "why-this-works.json",
  checklist: "checklist.json",
};

type SeedTip = { body: string; tags: string[] };

function loadSurface(surface: TipSurface): SeedTip[] {
  const path = join(__dirname, "tips-seed", SEED_FILES[surface]);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} is not a JSON array.`);
  }
  for (const [i, tip] of parsed.entries()) {
    const t = tip as Partial<SeedTip>;
    if (typeof t.body !== "string" || t.body.length < 20) {
      throw new Error(`${path}[${i}]: missing or implausibly short body.`);
    }
    if (!Array.isArray(t.tags) || t.tags.some((x) => typeof x !== "string")) {
      throw new Error(`${path}[${i}]: tags must be a string array.`);
    }
  }
  return parsed as SeedTip[];
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const db = appDb();

  const existing = await db
    .from("tips")
    .select("id", { count: "exact", head: true })
    .eq("source", "seed");
  if (existing.error) {
    throw new Error(`Could not check existing seeds: ${existing.error.message}`);
  }
  if ((existing.count ?? 0) > 0 && !force) {
    console.error(
      `Refusing to seed: ${existing.count} seed tips already exist. ` +
        "Re-run with --force only if you know why.",
    );
    process.exit(1);
  }

  let total = 0;
  for (const surface of TIP_SURFACES) {
    const tips = loadSurface(surface);
    const rows = tips.map((tip) => ({
      surface,
      body: tip.body,
      context_tags: tip.tags,
      source: "seed" as const,
    }));
    // Insert per surface in one call — 210 rows total, far under any limit.
    const res = await db.from("tips").insert(rows);
    if (res.error) {
      throw new Error(`Insert failed for ${surface}: ${res.error.message}`);
    }
    console.log(`${surface}: ${rows.length} tips`);
    total += rows.length;
  }
  console.log(`Seeded ${total} tips.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
