import { test } from "node:test";
import assert from "node:assert/strict";
import { withRetry } from "./retry.mjs";

// No real waiting: every test passes delayMs: 0, and one test measures the
// waits by injecting its own sleep.

test("returns the first successful result without retrying", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      return "ok";
    },
    { delayMs: 0 },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 1);
});

test("retries a failing call and returns the eventual success", async () => {
  let calls = 0;
  const result = await withRetry(
    async () => {
      calls += 1;
      if (calls < 3) throw new Error(`transient ${calls}`);
      return "ok";
    },
    { delayMs: 0 },
  );
  assert.equal(result, "ok");
  assert.equal(calls, 3);
});

test("gives up after `attempts` and rethrows the LAST error unchanged", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error(`attempt ${calls} failed`);
      },
      { attempts: 3, delayMs: 0 },
    ),
    (e) => e instanceof Error && e.message === "attempt 3 failed",
  );
  assert.equal(calls, 3);
});

test("attempts: 1 means a single call and no retry", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error("once");
      },
      { attempts: 1, delayMs: 0 },
    ),
    /once/,
  );
  assert.equal(calls, 1);
});

test("waits between attempts, growing, and never after the last one", async () => {
  const waits = [];
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error("always");
      },
      { attempts: 3, delayMs: 100, sleep: async (ms) => void waits.push(ms) },
    ),
    /always/,
  );
  assert.equal(calls, 3);
  assert.deepEqual(waits, [100, 200]);
});

test("defaults to three attempts", async () => {
  let calls = 0;
  await assert.rejects(
    withRetry(
      async () => {
        calls += 1;
        throw new Error("nope");
      },
      { delayMs: 0 },
    ),
    /nope/,
  );
  assert.equal(calls, 3);
});
