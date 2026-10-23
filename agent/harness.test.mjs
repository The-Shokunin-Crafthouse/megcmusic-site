// harness.test.mjs — the playbook agent's harness: spawn args, the per-job kill timer, and
// the startup reclaim of rows a crash left in `running` (studio harnesses.md, Megs Playbook).
//   Run: node --test agent/harness.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { claudeArgs, MAX_TURNS, JOB_TIMEOUT_MS, STALE_MS, withKillTimer, reclaimStale } from "./harness.mjs";

test("the spawn carries model, effort, a turn ceiling, no tools and no host settings", () => {
  const a = claudeArgs("sonnet", "high");
  assert.deepEqual(a.slice(0, 5), ["-p", "--model", "sonnet", "--effort", "high"]);
  assert.equal(a[a.indexOf("--max-turns") + 1], String(MAX_TURNS));
  assert.equal(MAX_TURNS, 3);
  assert.equal(a[a.indexOf("--tools") + 1], "", "every input is inlined; the model needs no tool");
  assert.equal(a[a.indexOf("--setting-sources") + 1], "", "the host user's CLAUDE.md and hooks stay out (#153)");
  assert.ok(a.includes("--include-partial-messages") && a.includes("stream-json"));
});

test("a job that outlives its timer is killed, and one that ends in time is not", async () => {
  assert.ok(JOB_TIMEOUT_MS > 60_000 && JOB_TIMEOUT_MS < STALE_MS, "the kill comes before the row looks stale");
  const slow = Object.assign(new EventEmitter(), { killed: null, kill(sig) { this.killed = sig; } });
  let fired = false;
  withKillTimer(slow, 20, () => { fired = true; });
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(slow.killed, "SIGTERM");
  assert.ok(fired);
  const quick = Object.assign(new EventEmitter(), { killed: null, kill(sig) { this.killed = sig; } });
  withKillTimer(quick, 20, () => {});
  quick.emit("close", 0);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(quick.killed, null);
});

function fakeDb(rows) {
  const calls = [];
  return {
    calls,
    from(table) {
      const q = { table, filters: [] };
      const b = {
        update(v) { q.update = v; return b; },
        in(col, vals) { q.filters.push(["in", col, vals]); return b; },
        lt(col, v) { q.filters.push(["lt", col, v]); return b; },
        select() { calls.push(q); return Promise.resolve({ data: rows, error: null }); },
      };
      return b;
    },
  };
}

test("on start, rows left running or streaming past the stale age go back to the queue", async () => {
  const db = fakeDb([{ id: "a" }, { id: "b" }]);
  const now = Date.parse("2026-10-23T12:00:00Z");
  const n = await reclaimStale(db, now);
  assert.equal(n, 2);
  const q = db.calls[0];
  assert.equal(q.table, "generation_jobs");
  assert.equal(q.update.status, "queued");
  assert.deepEqual(q.filters[0], ["in", "status", ["running", "streaming"]]);
  assert.deepEqual(q.filters[1], ["lt", "updated_at", new Date(now - STALE_MS).toISOString()]);
});

test("a reclaim that cannot write throws, never reads as nothing to reclaim (#45)", async () => {
  const db = { from: () => { const b = { update: () => b, in: () => b, lt: () => b, select: () => Promise.resolve({ data: null, error: { message: "denied" } }) }; return b; } };
  await assert.rejects(reclaimStale(db, Date.now()), /denied/);
});

test("the daemon uses the harness: one spawn site, the reclaim at start", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./playbook-agent.mjs", import.meta.url), "utf8");
  assert.match(src, /claudeArgs\(CLAUDE_MODEL, effort\)/);
  assert.match(src, /withKillTimer\(child,/);
  assert.match(src, /await reclaimStale\(db, Date\.now\(\)\)/);
});
