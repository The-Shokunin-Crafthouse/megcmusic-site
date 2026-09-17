# Diagnosis — "The Music page isn't linked to the live site" (2026-09-17)

**Reported (Levi, 2026-09-17):** the WordPress page titled "Music" does not appear to be connected to the live site; while uploading Meg's new EPK PDF, the content on the live page did not line up with the content of the dashboard's Music page.

**Finding, in one line:** the Music page *is* wired to the site, but only through its custom fields, not its block-editor body; and the EPK PDF save did reach WordPress correctly but its rebuild was dropped by a single retry-less network timeout in the prebuild, so for ~13 minutes the live `/epk` still showed "Coming soon".

Everything below was read directly from `admin.megcmusic.com/wp-json`, the GitHub Actions run logs, and the live `megcmusic.com` pages in a real browser — not inferred from code.

---

## 1. What each dashboard page feeds, and what it does not

| WP page (dashboard title, slug, id) | What the site reads from it | When | What the site ignores |
|---|---|---|---|
| **Music** (`music`, 5562) | Custom fields: page lede, the **Releases** repeater (title, year, kind, its page, its shop product, streaming links), artist Spotify/Apple/Amazon profiles, meta title/description, page photo | At build — `scripts/fetch-releases.mjs` → `src/generated/releases.json`; `scripts/fetch-hero-images.mjs` for the photo | **The block-editor body.** The gallery of covers under "Original Music" / "Solo Releases" is never rendered. Only a body paragraph of six or more words would appear, as "Liner Notes" (ADR 2026-07-13); today there is none. |
| **EPK** (`press-kit`, 608 — retitled from "Press Kit" today) | Custom fields: lede, four facts, **Kit items** (title, description, file *or* link), press items, set-list intro, resources note, meta | At build — `scripts/fetch-wp-content.mjs` → `src/generated/wp-content/epk.json` | The block-editor body, except that any file link (`.pdf`, `.doc`, `.zip`) placed in it is auto-discovered and listed under the named kit rows. Its video embeds and press links are not read. |

So the live `/music` page — Discography, Singles, Live Formats, Work With Me — is built from the Releases repeater plus config, and the dashboard editor shows Meg a stale cover gallery that nothing renders. Nothing in the editor says so. That is the whole of the "doesn't line up": the comparison was between an unrendered body and a page built from fields further down the same edit screen.

Where an EPK PDF goes: **EPK page → Kit items → a row's "file" field.** That is exactly where it was put today (attachment 6455, `Meghan-Clarisse-EPK.pdf`, 859,968 bytes, uploaded 14:36:50 local, attached to page 608).

## 2. What happened to the save (all times UTC; local MDT is −6h)

| Time | Event | Result |
|---|---|---|
| 20:36:50 | PDF uploaded to the media library, attached to page 608 | — |
| 20:37:11 | `wp-content-updated` dispatch → run 35271897203 | success — its `epk.json` snapshot was fetched at 20:37:55, before the page save below, so it carried the old rows |
| 20:38:43 | Page 608 saved: kit rows now "EPK" (file = the PDF) and "Sample Set List"; the "Solo Acoustic EPK" / "Full Band EPK" rows removed; page retitled "EPK" | plugin pinged GitHub |
| 20:38:43 | run **35272049526** | **failure** — `fetch-hero-images.mjs`: `could not read the photo field for the fyc-kindred-spirits page (WP page 4566) — The operation was aborted due to timeout` (one 20 s read, no retry). `fetch-wp-content.mjs` had already written the new `epk.json` 40 s earlier in the same run. |
| 20:40:43 | Alarm step opened issue #145; `deploy-alarm-watch.sh` relayed it and closed the issue at 20:42:24 | alarm worked as designed |
| 20:47:48 | Page 3666 (Sample Set List) saved | plugin pinged GitHub |
| 20:47:53 | run 35272963397 | success — aliased `megcmusic.com` at 20:49:56 |
| now | live `/epk` → "EPK · Download" → `https://admin.megcmusic.com/wp-content/uploads/2026/09/Meghan-Clarisse-EPK.pdf` (HTTP 200) | **the PDF is live** |

The PDF reached the site 11 minutes after the save only because an unrelated second save happened to fire a second rebuild. Without it, the next chance was the nightly scheduled deploy (~14:11 UTC the following day) — about 18 hours during which the dashboard and the site would disagree and nothing on Meg's side could explain why.

## 3. Root cause

`npm run build` runs four prebuild reads against WordPress before `next build`:

| Script | WP reads per build | Retries |
|---|---|---|
| `fetch-wp-content.mjs` | 5 pages (+1 slug lookup) | **3 attempts** |
| `fetch-releases.mjs` | 1 page + ~10 slug lookups | none |
| `fetch-hero-images.mjs` | 15 pages + up to 16 media + 16 downloads | none |
| `fetch-fyc-assets.mjs` | 2 pages + N sheet downloads | none |

Every read is a single `fetch` with a 15–30 s `AbortSignal.timeout`. One slow answer from the WordPress host — which today's three runs show happening roughly one read in a hundred — fails the whole build with a named cause. Failing loudly is correct (the previous deploy stays live, and the alarm fires). But a save-triggered rebuild is a one-shot event: nothing re-fires it, so a transient miss silently strands the editor's save until the next unrelated trigger. The retry that `fetch-wp-content.mjs` already has is the right behaviour; three of the four scripts never got it.

## 4. Fix (this sprint — `stages/03-build/sprint-15-save-path-resilience/CONTEXT.md`)

One shared retry for every build-time WordPress read and download, used by all four scripts, tests first. Behaviour is otherwise unchanged: a read that fails three times still fails the build with the same named cause.

## 5. Not a defect, but the source of the confusion

The Music page's block body is a vestige of the old theme. It is not rendered, its cover links still point at `www.megcmusic.com/…` (the pre-cutover host), and the field group above it gives no hint that the fields — not the body — are what the site shows. Retiring that body, or adding an editor notice to the Music field group, is a WordPress-side content/plugin change and is recorded below for the next sprint rather than done here.

## 6. Found on the way, not touched (for the next sprint)

1. **Music page (5562) block body** — unrendered stale gallery, links to the old host. Either empty it with a one-line note, or add a message field to the Music field group in `wp-plugin/megc-site-content/acf-json` saying the body is not shown. Plugin change → `wp-migrate.yml`; content change → Meg's call.
2. **EPK page (608) copy** — the surviving kit row is titled "EPK" but kept the Solo Acoustic description ("One-sheet, bio, and stage plot for intimate rooms."). Meg's copy is hers (2026-09-11 decision 5); flag to her, do not edit.
3. **Code comments still call page 608 "Press Kit"** (`src/lib/epk-content.ts`, `scripts/fetch-wp-content.mjs`, `src/components/EpkPressKit/EpkPressKit.tsx`, and the named rows "Solo Acoustic / Full Band / Set List" in the component doc-comment). Cosmetic; the slug `press-kit` is unchanged and the code keys on the id.
4. **Duplicate download risk on `/epk`** — `EpkPressKit` lists the named kit rows and then every file link auto-discovered in the page body, with no de-duplication by href. If Meg also links the PDF in the EPK page body it will render twice. Dedupe discovered assets against the named rows' hrefs.
5. **A save can trigger two rebuilds** — the media upload at 20:36:50 and the page save at 20:38:43 each fired a dispatch. `deploy.yml`'s concurrency group queues rather than cancels, so both ran. Harmless, but it doubles the Vercel upload spend (memory: the free tier's 5000/24 h cap has bitten before).
6. **The slow read was page 4566** (`fyc-kindred-spirits`) — one of 15 pages the hero script reads on every build, for a photo it has never had (`page_photo: false`). Not a defect; noted so a repeat on the same page reads as a WordPress-host pattern, not a new bug.
