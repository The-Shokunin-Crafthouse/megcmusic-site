import { test } from "node:test";
import assert from "node:assert/strict";
import { fail, ok, unauthorized } from "./http";

// Every outreach response is live pipeline state; none may be stored by a
// browser, proxy or the Playbook service worker (decisions 2026-10-10).
const NO_STORE = "no-store, max-age=0";

test("ok() responses carry Cache-Control: no-store", () => {
  const res = ok({ rows: [] });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), NO_STORE);
  assert.match(res.headers.get("content-type") ?? "", /application\/json/);
});

test("ok() with an explicit status keeps no-store", () => {
  const res = ok({ inserted: 1 }, 201);
  assert.equal(res.status, 201);
  assert.equal(res.headers.get("cache-control"), NO_STORE);
});

test("fail() responses carry Cache-Control: no-store", async () => {
  const res = fail("boom", 502);
  assert.equal(res.status, 502);
  assert.equal(res.headers.get("cache-control"), NO_STORE);
  assert.deepEqual(await res.json(), { error: "boom" });
});

test("unauthorized() responses carry Cache-Control: no-store", () => {
  const res = unauthorized();
  assert.equal(res.status, 401);
  assert.equal(res.headers.get("cache-control"), NO_STORE);
});
