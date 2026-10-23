// harness.mjs — the playbook agent's harness, kept apart from the daemon so it can be
// tested without starting one (studio harnesses.md, Megs Playbook agent).
//
// Every job is one JSON answer to a prompt that already carries every input, so the
// spawn removes every tool and loads none of the host user's settings, CLAUDE.md or hooks
// (#153), and is bounded twice: a turn ceiling (#168) and a kill timer. A daemon that
// crashed mid-job left its row in `running` for good; the reclaim puts it back.

/** One answer, and room for the repair round-trip's retry. */
export const MAX_TURNS = 3;
/** A job runs about 10 s (measured 9.52 s to the full reply); 10 minutes is a hung one. */
export const JOB_TIMEOUT_MS = 10 * 60 * 1000;
/** A streaming row refreshes `updated_at` every ~2 s; 15 minutes without one is orphaned. */
export const STALE_MS = 15 * 60 * 1000;

export function claudeArgs(model, effort) {
  return ["-p", "--model", model, "--effort", effort, "--max-turns", String(MAX_TURNS),
    "--tools", "", "--setting-sources", "",
    "--output-format", "stream-json", "--include-partial-messages", "--verbose"];
}

/** Kill `child` with SIGTERM after `ms` unless it closes first; `onKill` runs on a kill. */
export function withKillTimer(child, ms, onKill) {
  const timer = setTimeout(() => { onKill(); child.kill("SIGTERM"); }, ms);
  child.on("close", () => clearTimeout(timer));
  return timer;
}

/** Rows left `running` or `streaming` with no update for STALE_MS go back to `queued`.
 *  Returns how many. A write that fails throws: never read as "nothing to reclaim" (#45). */
export async function reclaimStale(db, now) {
  const { data, error } = await db
    .from("generation_jobs")
    .update({ status: "queued", error: null, updated_at: new Date(now).toISOString() })
    .in("status", ["running", "streaming"])
    .lt("updated_at", new Date(now - STALE_MS).toISOString())
    .select("id");
  if (error) throw new Error(`reclaim stale jobs: ${error.message || JSON.stringify(error)}`);
  return (data || []).length;
}
