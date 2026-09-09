/**
 * Authenticated WordPress reads and small, recorded writes — Sprint 12.
 *
 * Runs in GitHub Actions (wp-ops.yml), the one context that both reaches
 * admin.megcmusic.com and holds the `megc-automation` application password
 * (WP_APP_USER / WP_APP_PASSWORD secrets). Plain Node, no install step.
 *
 *   node scripts/wp-ops/wp-ops.mjs --op read-config
 *   node scripts/wp-ops/wp-ops.mjs --op set-titles  --args "4=Home;6073=Subscribe"
 *   node scripts/wp-ops/wp-ops.mjs --op trash-pages --args "47,2946"
 *
 * Writes run only when CONFIRM=write; otherwise they dry-run and report what
 * they would do. trash-pages never passes `force` — pages go to Trash, never
 * past it. Every op prints one JSON document to stdout and, when OUT is set,
 * writes the same document to that path for the workflow artifact.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ORIGIN = "https://admin.megcmusic.com";
const WP = `${ORIGIN}/wp-json/wp/v2`;
const WC = `${ORIGIN}/wp-json/wc/v3`;
const TIMEOUT_MS = 20_000;

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? "" : (argv[i + 1] ?? "");
};
const OP = flag("op");
const ARGS = flag("args");
const CONFIRM = process.env.CONFIRM === "write";
const OUT = process.env.OUT || "";

const USER = process.env.WP_APP_USER;
const PASS = process.env.WP_APP_PASSWORD;
if (!USER || !PASS) {
  console.error("Missing WP_APP_USER / WP_APP_PASSWORD");
  process.exit(2);
}
const AUTH = "Basic " + Buffer.from(`${USER}:${PASS}`).toString("base64");

/** One request. Never throws on a non-2xx: returns { status, ok, body } so an
 *  auth failure and a wrong-shaped 200 stay distinguishable (learning #46). */
async function call(url, init = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: AUTH,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { _unparsed: text.slice(0, 500) };
  }
  return { status: res.status, ok: res.ok, body };
}

const PAGE_FIELDS = "id,title,slug,status,modified,parent,link";

async function readConfig() {
  const out = { read_at: new Date().toISOString(), origin: ORIGIN };
  out.wp_settings = await call(`${WP}/settings`);
  out.wc_advanced_settings = await call(`${WC}/settings/advanced`);
  out.menus = await call(`${WP}/menus?per_page=100`);
  out.menu_items = await call(`${WP}/menu-items?per_page=100&_fields=id,title,url,object,object_id,type,menus,parent`);
  out.non_public_pages = await call(
    `${WP}/pages?status=draft,pending,private,future&per_page=100&_fields=${PAGE_FIELDS}`,
  );
  out.trashed_pages = await call(`${WP}/pages?status=trash&per_page=100&_fields=${PAGE_FIELDS}`);
  out.me = await call(`${WP}/users/me?_fields=id,name,roles`);
  return out;
}

/** "4=Home;6073=Subscribe" → [{ id: 4, title: "Home" }, …] */
function parseTitles(s) {
  return s
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const eq = p.indexOf("=");
      if (eq < 1) throw new Error(`bad title arg: "${p}" (want id=Title)`);
      const id = Number(p.slice(0, eq));
      const title = p.slice(eq + 1).trim();
      if (!Number.isInteger(id) || !title) throw new Error(`bad title arg: "${p}"`);
      return { id, title };
    });
}

async function setTitles() {
  const wanted = parseTitles(ARGS);
  const results = [];
  for (const { id, title } of wanted) {
    const before = await call(`${WP}/pages/${id}?_fields=${PAGE_FIELDS}`);
    const row = { id, wanted_title: title, before: before.body, mode: CONFIRM ? "write" : "dry-run" };
    if (CONFIRM && before.ok) {
      row.write = await call(`${WP}/pages/${id}`, {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      row.after = (await call(`${WP}/pages/${id}?_fields=${PAGE_FIELDS}`)).body;
      row.slug_unchanged = row.after?.slug === before.body?.slug;
    }
    results.push(row);
  }
  return { ran_at: new Date().toISOString(), mode: CONFIRM ? "write" : "dry-run", results };
}

async function trashPages() {
  const ids = ARGS.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) throw new Error("trash-pages needs --args \"id,id,…\"");
  const results = [];
  for (const id of ids) {
    const before = await call(`${WP}/pages/${id}?_fields=${PAGE_FIELDS}`);
    const row = { id, before: before.body, mode: CONFIRM ? "write" : "dry-run" };
    if (CONFIRM && before.ok) {
      // No `force`: WordPress moves the page to Trash and returns it with status "trash".
      row.trash = await call(`${WP}/pages/${id}`, { method: "DELETE" });
      row.after_status = row.trash.body?.status;
    }
    results.push(row);
  }
  return { ran_at: new Date().toISOString(), mode: CONFIRM ? "write" : "dry-run", results };
}

const ops = { "read-config": readConfig, "set-titles": setTitles, "trash-pages": trashPages };
if (!ops[OP]) {
  console.error(`unknown --op "${OP}" (want ${Object.keys(ops).join(" | ")})`);
  process.exit(2);
}

const result = await ops[OP]();
const json = JSON.stringify(result, null, 2);
console.log(json);
if (OUT) {
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, json + "\n");
}
