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
 *   node scripts/wp-ops/wp-ops.mjs --op remove-menu-items --args "4479,49"
 *   node scripts/wp-ops/wp-ops.mjs --op insert-lyric-sheet --args "page=4350;media=4352;at=1"
 *   node scripts/wp-ops/wp-ops.mjs --op set-media-alt --args "6374=Bright Lights lyrics"
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

/**
 * Remove nav menu items. Menu items have no Trash (the REST route needs
 * `force=true`), so this is the one hard delete here — of a menu ROW, never a
 * page. Any child items are reparented to top level first, so removing a
 * parent never orphans what sat under it.
 */
async function removeMenuItems() {
  const ids = ARGS.split(",").map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  if (!ids.length) throw new Error("remove-menu-items needs --args \"id,id,…\"");
  const all = await call(`${WP}/menu-items?per_page=100&_fields=id,title,menus,parent,object,object_id,url`);
  const items = Array.isArray(all.body) ? all.body : [];
  const results = [];
  for (const id of ids) {
    const item = items.find((i) => i.id === id);
    const children = items.filter((i) => i.parent === id);
    const row = { id, item: item ?? null, children: children.map((c) => ({ id: c.id, title: c.title?.rendered })), mode: CONFIRM ? "write" : "dry-run" };
    if (!item) { row.error = "no such menu item"; results.push(row); continue; }
    if (CONFIRM) {
      row.reparented = [];
      for (const c of children) {
        const r = await call(`${WP}/menu-items/${c.id}`, { method: "POST", body: JSON.stringify({ parent: 0 }) });
        row.reparented.push({ id: c.id, status: r.status, parent_after: r.body?.parent });
      }
      row.delete = await call(`${WP}/menu-items/${id}?force=true`, { method: "DELETE" });
      row.deleted = row.delete.body?.deleted === true;
    }
    results.push(row);
  }
  return { ran_at: new Date().toISOString(), mode: CONFIRM ? "write" : "dry-run", results };
}

/** "page=4350;media=4352;at=1" → { page, media, at }. `at` is 1-based and
 *  clamps to the ends; omit it to append. */
function parseInsert(s) {
  const kv = Object.fromEntries(
    s.split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const num = (k) => {
    const n = Number(kv[k]);
    return Number.isInteger(n) && n > 0 ? n : 0;
  };
  const page = num("page");
  const media = num("media");
  if (!page || !media) {
    throw new Error('insert-lyric-sheet needs --args "page=<id>;media=<id>[;at=<1-based>]"');
  }
  return { page, media, at: kv.at === undefined ? 0 : num("at") };
}

/**
 * Put one media item into a campaign page's ACF `lyric_sheets` gallery.
 *
 * The gallery is Meg's content, so this exists to repair a specific gap rather
 * than to own the field: the Shadows credits sheet was left out when the
 * optimised sheets were uploaded, which is why the FYC page listed eleven
 * lyric sheets and no credits while the release page showed both.
 *
 * Writes the whole list back by id — ACF's gallery takes an id array — after
 * splicing the new one in. Idempotent: a media id already in the gallery is
 * reported and nothing is written, so a re-run can never double it.
 */
async function insertLyricSheet() {
  const { page, media, at } = parseInsert(ARGS);
  const row = { page, media, at: at || "append", mode: CONFIRM ? "write" : "dry-run" };

  const asset = await call(`${WP}/media/${media}?_fields=id,source_url,mime_type,alt_text`);
  if (!asset.ok) {
    row.error = `media ${media} is not readable (HTTP ${asset.status})`;
    return { ran_at: new Date().toISOString(), ...row };
  }
  row.asset = asset.body;

  const read = await call(`${WP}/pages/${page}?acf_format=standard&_fields=acf.lyric_sheets`);
  if (!read.ok) {
    row.error = `page ${page} is not readable (HTTP ${read.status})`;
    return { ran_at: new Date().toISOString(), ...row };
  }
  // ACF returns `false`, not [], for an empty gallery.
  const current = Array.isArray(read.body?.acf?.lyric_sheets) ? read.body.acf.lyric_sheets : [];
  const before = current.map((item) => Number(item.ID ?? item.id));
  row.before = before;

  if (before.includes(media)) {
    row.already_present = true;
    row.after = before;
    return { ran_at: new Date().toISOString(), ...row };
  }

  const index = at ? Math.min(Math.max(at - 1, 0), before.length) : before.length;
  const wanted = [...before.slice(0, index), media, ...before.slice(index)];
  row.wanted = wanted;

  if (CONFIRM) {
    row.write = await call(`${WP}/pages/${page}`, {
      method: "POST",
      body: JSON.stringify({ acf: { lyric_sheets: wanted } }),
    });
    const back = await call(`${WP}/pages/${page}?acf_format=standard&_fields=acf.lyric_sheets`);
    const after = Array.isArray(back.body?.acf?.lyric_sheets)
      ? back.body.acf.lyric_sheets.map((item) => Number(item.ID ?? item.id))
      : [];
    row.after = after;
    // Read back rather than trusting the write's 200 — a field that silently
    // refused the update returns the old list, which is a failure, not a no-op.
    row.matches_wanted = after.length === wanted.length && after.every((id, i) => id === wanted[i]);
  }
  return { ran_at: new Date().toISOString(), ...row };
}

/**
 * Set the alt text on media items — the accessible name for an image whose
 * content is its whole point.
 *
 * Meg's twelve Shadows sheets went into the gallery with empty alt, so a screen
 * reader met twelve unlabelled images where a sighted visitor reads a song. Alt
 * lives on the attachment, not the gallery, which is why the ACF field's help
 * text sends her to the media library and why this is a media op rather than a
 * page one.
 *
 * Reuses set-titles' "id=value;id=value" argument shape. Reads each item back
 * afterwards: WordPress returns 200 for a field it declined to change.
 */
async function setMediaAlt() {
  const wanted = ARGS
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const i = p.indexOf("=");
      const id = Number(p.slice(0, i).trim());
      const alt = p.slice(i + 1).trim();
      if (!Number.isInteger(id) || id <= 0 || !alt) {
        throw new Error(`set-media-alt: cannot read "${p}" as "id=alt text"`);
      }
      return { id, alt };
    });
  if (!wanted.length) throw new Error('set-media-alt needs --args "id=alt text;id=alt text"');

  const FIELDS = "id,alt_text,source_url";
  const results = [];
  for (const { id, alt } of wanted) {
    const before = await call(`${WP}/media/${id}?_fields=${FIELDS}`);
    const row = {
      id,
      wanted_alt: alt,
      before_alt: before.body?.alt_text ?? null,
      file: before.body?.source_url?.split("/").pop() ?? null,
      mode: CONFIRM ? "write" : "dry-run",
    };
    if (!before.ok) {
      row.error = `media ${id} is not readable (HTTP ${before.status})`;
      results.push(row);
      continue;
    }
    if (CONFIRM) {
      row.write_status = (
        await call(`${WP}/media/${id}`, {
          method: "POST",
          body: JSON.stringify({ alt_text: alt }),
        })
      ).status;
      row.after_alt = (await call(`${WP}/media/${id}?_fields=${FIELDS}`)).body?.alt_text ?? null;
      row.matches_wanted = row.after_alt === alt;
    }
    results.push(row);
  }
  return {
    ran_at: new Date().toISOString(),
    mode: CONFIRM ? "write" : "dry-run",
    all_match: CONFIRM ? results.every((r) => r.matches_wanted === true) : null,
    results,
  };
}

const ops = { "read-config": readConfig, "set-titles": setTitles, "trash-pages": trashPages, "remove-menu-items": removeMenuItems, "insert-lyric-sheet": insertLyricSheet, "set-media-alt": setMediaAlt };
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
