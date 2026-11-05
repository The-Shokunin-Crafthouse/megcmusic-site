import { test } from "node:test";
import assert from "node:assert/strict";
import { isUnpublishedPage } from "./wp-unpublished.mjs";

const json = (status, body) => new Response(JSON.stringify(body), { status });

test("a draft page's REST answer reads as unpublished", async () => {
  const res = json(401, { code: "rest_forbidden", message: "Sorry, you are not allowed to do that." });
  assert.equal(await isUnpublishedPage(res), true);
});

test("the response body stays readable after the check", async () => {
  const res = json(200, { acf: {} });
  await isUnpublishedPage(res);
  assert.deepEqual(await res.json(), { acf: {} });
});

test("a 401 with another code is not unpublished: it stays a build failure", async () => {
  assert.equal(await isUnpublishedPage(json(401, { code: "invalid_username" })), false);
});

test("a 401 with no JSON body is not unpublished", async () => {
  assert.equal(await isUnpublishedPage(new Response("<html>Unauthorized</html>", { status: 401 })), false);
});

test("other failures are not unpublished", async () => {
  assert.equal(await isUnpublishedPage(json(403, { code: "rest_forbidden" })), false);
  assert.equal(await isUnpublishedPage(json(404, { code: "rest_post_invalid_id" })), false);
  assert.equal(await isUnpublishedPage(json(500, { code: "rest_forbidden" })), false);
});
