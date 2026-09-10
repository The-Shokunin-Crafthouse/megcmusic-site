# SPRINT 12 — Video findability, page-list cleanup, and the content-blocks question (CONTRACT)

> **File as** `stages/03-build/sprint-12-findability-and-blocks/CONTEXT.md`. First commit: this file + `WORKSPACE.md` `Current sprint:` pointer + `workspace.manifest.yaml` if it lists sprints. Branch per phase off a clean `main` (confirm `git status` first — ADR-072 main-sync).
>
> **Inputs table**
>
> | Input | Path | Why |
> |---|---|---|
> | Workspace identity | `WORKSPACE.md` | Binding rules; sprint pointer |
> | Workflow gates | `../studio-memory/WORKFLOW.md` | Stage/gate discipline |
> | Decision log | `decisions/decisions.md` | Every 2026-09-06 entry (Sprint 11 close-out); the 2026-08-29 kickoff entry holding decision 1.4; the 2026-07-03 datacenter-block entry; the shop/checkout hand-off entry |
> | Repo learnings | `LEARNINGS.md` | 2026-08-27 Bluehost entries (admin-hook fatals; 409 on wp-admin from datacenter IPs); 2026-09-06 parity-probe entries |
> | Sprint 11 contract | `stages/03-build/sprint-11-wp-editability/CONTEXT.md` | Invariants inherited verbatim (§2 below) |
> | Sprint 11 page baseline | `stages/03-build/sprint-11-wp-editability/output/content-inventory.md` §"Existing WP pages" | The 2026-08-29 list of 34 pages — Phase B's starting point, to be diffed against live |
> | Meg's guide | `docs/meg-editing-guide.html` (+ `.pdf`) | Section 02 table is what she was given; re-render the PDF with Playwright `page.pdf` after any edit |
> | Plugin | `wp-plugin/megc-site-content/megc-site-content.php`, `acf-json/group_megc_videos.json`, `acf-json/group_megc_media_page.json`, `README.md` | Tracked page ids; field groups located by page id; install steps (the human gate) |
> | Video pipeline | `scripts/fetch-wp-content.mjs` (`SURFACES`), `src/lib/videos-content.ts`, `src/lib/api/youtube.ts`, `src/lib/api/wordpress-browser.ts` (`fetchVideosSourceBrowser`), `src/lib/media-videos.ts`, `src/components/Videos/VideosGallery.tsx`, `src/config/videos.ts` | Phase A subjects |
> | Parity harness | `scripts/parity/README.md`, `parity.mjs`, `states.mjs` | Phase A option 2 and Phase B re-verify. Noise floor first |
> | Write path | `.github/workflows/wp-migrate.yml`, `scripts/wp-migrate/migrate-content.ts` | The only place `WP_APP_USER`/`WP_APP_PASSWORD` exist (GHA secrets; not in `.env.local`) |
>
> **Resume pointer:** `SESSION-RESUME.md` at repo root (hook-owned). **Turn ceilings:** Phase A 40 turns, Phase B 30, Phase C 15. On hitting one: park with a resume note, open the PR as draft with what exists, stop.
>
> **Phase status (2026-09-10):** A — merged (#108, #112) and live, whole list showing; A.2 save-and-check still Levi's to run · B — merged (#110): eleven pages trashed, four menu items removed, re-verified; Levi's checkout hand-off check still open · C — Option 2 picked by Levi (superseding entry logged); Home blocks audit written as the gate artifact for the next sprint. **Close-out pending on Levi:** A.2 save-and-check (`output/phase-a-save-and-check.md`) and the Woo checkout hand-off from his browser (B.3); then `sc-learn`, contract summary line. Sprint 13 filed 2026-09-10 and holds the pointer meanwhile.

---

Project: megcmusic-site (The-Shokunin-Crafthouse/megcmusic-site) · Owner: Levi · Client editor: Meghan Clarisse Cave · Date: 2026-09-09 · Status: Approved by Levi — execute Phases A and B; Phase C is a recommendation only.

**Prime directive:** Meg opens her dashboard, finds where videos live in under ten seconds, adds a YouTube link, and sees it on the site; her page list contains only pages that are part of the live business; and Levi has a written, costed answer on content blocks. Zero change to the site's design, layout, motion, URLs, or current content.

## 0. Context you must load first

Read the Inputs table in order. Do not load `_config/` in full. Do not reopen any 2026-09-06 decision; this sprint is new scope on top of a correctly shipped Sprint 11.

## 1. What is already known — verified 2026-09-09 unless marked *hypothesis*

Re-verify each **verified** line with one read before relying on it (learning #123 — a fact base can go stale in a day). Do not write a *hypothesis* into `decisions.md` as a cause (learning #135).

**Verified — the two-page split.**
- Page 10 "Media" carries `page_lede`, `meta_title`, `meta_description` and the shared `page_photo` — no video fields. Page 5560 "Videos" carries `featured_video_url` + the `video_list` repeater. Field groups attach by page id in `acf-json/*.json`, so moving a field between pages is a plugin file change.
- Page 5560's `video_list` holds **9 entries** (as of 2026-09-05 10:37, the last modification); the featured URL is `A8E_XRwkhTk`. `src/generated/wp-content/videos.json` (committed) matches. Page 5560's **body** contains zero YouTube embeds.
- Page 4 (Home) and page 4350 (FYC Shadows) were modified **2026-09-08**, and three `wp-content-updated` production deploys ran 18:21–18:29 UTC that day. Meg was editing those two pages, not 5560, when she reported the problem. Diff their live ACF against the committed `src/generated/wp-content/home.json` / `fyc*.json` to see exactly what she changed.
- **Three tracked pages have an empty title in WP:** 4 (Home), 6060 (`mail`), 6073 (`subscribe`). In her page list Home appears as "(no title)". That is a findability defect of its own; fix it in Phase A (a title write over REST; nothing in `src/lib/*-content.ts` reads page 4's title — re-grep before writing).
- Meg's guide, section 02, already lists "Media" and "Videos" as separate rows. The guide is not wrong; it is not working.

**Verified — how videos actually reach the page (this is where the bug most likely lives).**
- Server side, `getVideos()` in `src/lib/api/youtube.ts` merges in this order: featured → **channel RSS newest uploads (up to 15)** → Meg's `video_list` → `extraVideoIds`, deduped.
- `VideosGallery.tsx` renders the active video plus `.slice(0, 4)` of the rest — **five tiles total.**
- Consequence: the four playlist slots are filled by the channel's newest uploads. A video Meg adds to her list appears only if it is also among the channel's newest four, or if RSS fails. The field's help text says "The playlist order on Home and Media" — the code does not honor that. *Hypothesis to confirm:* this is why "the videos that already exist" do not show — they are in her list, and the list is outranked and truncated.
- Client side, `fetchVideosSourceBrowser()` refetches page **`slug=videos`** from the visitor's browser and `reconcile()`s: featured first, then the server list, then ids parsed from the page **body** (not the repeater). So a body embed is honored client-side; the repeater is honored only at build. Any rename of page 5560 must leave the slug `videos` untouched or this path silently returns empty.

**Verified — the write path.** Authenticated REST writes run from GitHub Actions (`wp-migrate.yml`, `workflow_dispatch`, `WP_APP_USER`/`WP_APP_PASSWORD` secrets) and from any residential IP holding the `megc-automation` application password. This session's Mac is residential, but the password is not on it. Options, in order: (1) a small `workflow_dispatch` job modeled on `wp-migrate.yml` with an explicit `write` input; (2) Levi pastes the password into `.env.local` for the session (never commit); (3) local Chrome with Levi logged into wp-admin. A title change or a trash is a `POST /wp/v2/pages/{id}` / `DELETE /wp/v2/pages/{id}` (no `force`) — no wp-admin GUI needed for the action itself. Seeing what Meg sees (her page list) does need wp-admin via local Chrome.

**Verified — the tracked list.** `megc_site_content_page_ids()` + `site-poetry` by slug = 20 pages: 4, 5, 10, 20, 608, 1847, 2931, 2939, 3742, 4350, 4378, 4395, 4403, 4411, 4566, 5520, 5560, 5562, 3666, 6326. Live REST returns **35 published pages** (the 2026-08-29 inventory had 34; the new one is 6326 `site-poetry`). So 15 pages are untracked — and **at least seven of those are live-critical anyway** (see Phase B protected class). "Untracked" ≠ "orphaned".

**Verified — a plugin change is a human gate.** Field-group JSON lives in the plugin folder; any change to it (moving fields, adding a `message` field, an `admin_notices` hook) ships only by re-uploading the plugin through wp-admin from a residential IP (README steps 2 + 6). Sprint 11 declined the dashboard note for exactly this reason.

**Standing decisions.** Sprint 11 invariants (§2) are not up for renegotiation in Phases A or B. Sprint 11 decision 1.4 ("Edit existing surfaces only… no generic page-builder template") is what Phase C reconsiders — as a proposal, never as a build.

## 2. Invariants — inherited from Sprint 11 verbatim, plus two

- Pixel parity at 390/768/1024/1440/1920 on every touched route, proven with `scripts/parity/parity.mjs` after establishing the noise floor (same origin both sides) — never a claim. Content parity: rendered text, metadata, canonical, redirect suite (`/fyc`, `/shadows-of-a-ghost-town`, the admin-subdomain 301) unchanged.
- No WP core/theme edits. Never touch WooCommerce, The Events Calendar, or existing WP content destructively. Everything PHP-8.3-clean, tiny, versioned in the repo (`wp-plugin-lint.yml` must pass).
- Fail loudly, never blankly.
- Process: protected `main`, one PR per phase, ADR per locked decision via `sc-adr` (dated entry, supersede-never-rewrite, append-only — learning #163), LEARNINGS at close via `sc-learn`, resume pointer maintained, turn ceiling per phase.
- **New:** every gate line below names its producing artifact and its runner (learnings #181, #226). A line with no artifact is not satisfied.
- **New:** page 5560's slug stays `videos` and page 10's slug stays `media` through every option in this sprint. Verify with `GET /wp/v2/pages/{id}?_fields=slug` after any write.

## 3. Phase A — Fix the video-findability bug (first; it is blocking her)

**A.0 Diagnose before touching anything.** Produce `output/phase-a-diagnosis.md` with a row per hypothesis, the discriminating test, and the result. Hypotheses, ordered by prior:

1. *Truncation and ordering:* her list is outranked by channel RSS and cut at five. Test: run `getVideos()` locally (or read the production `/media` HTML) and compare the five rendered ids against `video_list`. If her list ids are absent while RSS ids fill the slots, this is confirmed.
2. *Wrong page:* on 2026-09-08 she wrote video URLs into a field on page 4 or 4350. Test: diff live ACF of 4 and 4350 against the committed generated JSON; check the FYC `videos` repeater and any text field for a YouTube URL.
3. *Findability:* "Videos" is not adjacent to "Media" in her list, and Home reads "(no title)". Test: with Levi logged in, screenshot wp-admin → Pages as she sees it (local Chrome only; Bluehost 409s datacenter IPs). If Levi is unavailable, record "not observed" — do not infer.
4. *Client reconcile:* `fetchVideosSourceBrowser` returns empty in her browser (CORS, timeout, cached empty in `sessionStorage`). Test: run it from the local browser against production and inspect the cache write.
5. *Guide never reached her.* Ask Levi one line; record the answer.

Read raw responses; split an auth failure from a wrong-shaped 200 (learning #46).

**A.1 Fix — smallest change that makes it permanently unambiguous.** Choose from these after A.0, and log the choice as one ADR with the confirmed cause:

- **Code fix (no human gate, no content change):** if hypothesis 1 confirms, make the merge honor the help text: featured → Meg's list in her order → channel RSS → extras. Keep the five-tile cap unless Levi says otherwise (that is a design change, so it is his call — ask one line). Update `videos-content.ts` and `youtube.ts` comments; add a unit test for the merge order; parity on `/` and `/media` (the tile set is expected to change — that is the fix — so the parity artifact is the before/after diff **reviewed and annotated**, not "identical").
- **Rename (REST title write, no human gate):** page 5560 title → "Media — Videos" so it sorts beside "Media". Slug untouched. Also set page 4's title to "Home" (and 6060/6073 to their real names) so her list has no "(no title)" rows. This is a save on tracked pages → it fires a production rebuild; that is fine.
- **Move the fields onto page 10 (plugin change = human gate + code change):** only if A.0 shows the two-page split itself is the cause and the rename is not enough. Touches `group_megc_videos.json` (location → 10), `SURFACES` in the fetcher (drop `videos`, read the fields from `media`), `videos-content.ts` (import `media.json`), `fetchVideosSourceBrowser` (`slug=media` or a page-id lookup), the guide, and a plugin version bump. Full parity proof. Re-upload through the human gate with the exact README click path.
- **Dashboard-visible note (plugin change = human gate):** the lowest-risk form is an SCF `message` field at the top of the Media field group ("Videos are on the page called Media — Videos"), which renders inside the editor with no admin hooks at all — the Aug 27 outage class was admin hooks. Still a plugin re-upload. Include it only if you are already going through the gate for the move; do not open the gate for it alone.

Every option updates `docs/meg-editing-guide.html` section 02 and re-renders the PDF.

**A.2 Verify at the destination (learning #45).** The closing artifact is `output/phase-a-save-and-check.md`: a real entry added to `video_list` (by Meg, or by Levi acting as Meg in wp-admin; **runner: Levi**, not the building session), the dispatch run id, the deploy time, and a screenshot of the new tile on `/media` and `/`. A build that compiles is not verification.

**A.3 PR + ADR + resume.** One PR. ADR names the confirmed cause and the chosen fix; hypotheses that did not confirm are listed as ruled out with their evidence.

## 4. Phase B — Clean up Meg's WordPress page list (classify → approve → trash → re-verify)

**B.0 Pull the full current list**, all statuses the REST API will show (`status=publish,draft,pending,private,future` needs auth for non-public statuses; note what you could and could not see). Write `output/phase-b-page-classification.md`: one row per page — id, title, slug, status, parent, last modified, class, evidence.

**Four classes, not three:**

- **Tracked-live** — in the 20-id list and rendered on the live site today.
- **Tracked-dormant** — in the list but not linked from live nav (4566, the archived FYC). Leave alone.
- **Protected** — not tracked by the plugin but live-critical. Known members: `cart` 1848, `checkout` 1849, `my-account` 1850 (WooCommerce system pages — the headless cart hands off to the existing Woo/PayPal checkout on the WP origin; trashing Checkout breaks the store), `tickets-checkout` 3547 and `tickets-order` 3548 (Event Tickets pages), the privacy-policy page if one is set, the page set as `page_on_front`/`page_for_posts`, and any page a WP menu, a WooCommerce or TEC setting, or `next.config` redirect points at. Read `wp/v2/settings` and `wc/v3/settings` (auth) or the wp-admin screens to confirm; never guess membership of this class.
- **Orphan candidate** — none of the above, and plausibly pre-rebuild leftovers. From the live list the candidates are: `about` 47, `band` 2946, `connect` 3750, `newsletter-signup` 3782, `songs-from-the-sofa` 4386 (duplicate of canonical 4395), `reviews-shadows-of-a-ghost-town` 5134, `kindred-spirits-review` 5339, the Amy Speace workshop page 5590, `mail` 6060, `subscribe` 6073. **Each needs evidence before it stays a candidate:** not linked from the live site (grep the built HTML of every route), not the target of a redirect, not referenced by a tracked page's ACF field (e.g. a release page's reviews link), not in a WP menu, and its public URL on `admin.megcmusic.com/<slug>` not an inbound link the business still uses (check the newsletter/social links Meg uses — `mail` and `subscribe` look like Mailchimp landing pages that may be linked from her Instagram bio; ask).

**B.1 Gate — explicit one-line yes from Levi on the orphan list, by id.** Nothing moves before it. If any page is ambiguous, it stays out of the list and is named as ambiguous in the report; do not resolve ambiguity by including it.

**B.2 Act.** Trash only (`DELETE /wp/v2/pages/{id}` without `force`, or wp-admin Trash). Record every id, title, slug, and the response in `output/phase-b-trashed.md`. Note for Levi: WordPress permanently empties Trash after 30 days by cron on this install (`EMPTY_TRASH_DAYS` default), and the Aug 27 learnings show WP-cron here is unreliable — so the 30-day window is not a guarantee in either direction. Trashing an untracked page does not fire the rebuild dispatch (the hook filters on the tracked ids), so trigger one production deploy manually afterward.

**B.3 Re-verify.** Parity harness on every route (noise floor first); redirect suite; a manual load of the Woo checkout hand-off and a ticket page. Artifact: `output/phase-b-parity/` with the reviewed diff. **Runner: the building session runs the harness; Levi confirms the checkout hand-off from his own browser.**

**B.4 PR + ADR** recording the classification rule, the protected set, and the trashed ids.

## 5. Phase C — Should Meg get her own content blocks? (recommendation only, no code)

Write `output/phase-c-blocks-recommendation.md` and stop. Cover, at minimum:

1. **SCF Flexible Content, scoped to specific pages.** Note first that the install runs Secure Custom Fields, not ACF Pro — confirm the installed SCF version ships Flexible Content (it forked ACF with the Pro field types; verify, do not assume). Meg picks from a bounded set of hand-built block types (photo + text, pull quote, video embed, callout — name the real candidates from what her pages actually need) and can add, remove, reorder. Every block is a designed component; parity discipline still holds per block.
2. **The narrower version:** flexible zones only where a recurring need exists (name where — likely Home and Media only), not every page.
3. **A third-party page builder (Elementor, WPBakery):** state plainly that it breaks the studio's no-page-builder default and what it puts at risk — pixel parity, token-map control, the guide's "nothing you type can break how the site looks" promise, and the Bluehost plugin-outage history. Do not recommend it unless you believe it is right.

For the recommended option give: field-group changes (each is a plugin re-upload), new components, PR count, what needs a Phase-0-style audit first (which existing sections would become blocks vs stay fixed), the effect on `fetch-wp-content.mjs` (flexible content arrives as a layout array — extend the shape, never swap it, learning #60), and the effect on the guide. Then stop and wait for Levi's pick. Decision 1.4 stays in force until he writes the superseding entry.

## 6. Stop conditions — park and report instead of improvising

Stop and surface to Levi if: an action needs wp-admin at the keyboard (name the exact click path); the application password is needed and unavailable (name which of the three write paths you want); the video root cause requires touching WooCommerce, The Events Calendar, or anything outside the plugin's scope; a page cannot be confidently placed in a class; Phase A's fix would change the five-tile design; or Phase C's recommendation would require reversing more of Sprint 11 than decision 1.4. Name the blocker, what you tried, and the smallest decision needed — then stop.

## 7. Close-out

Per phase: PR merged, ADR logged, phase status line in this file updated. At sprint close: `sc-learn` (LEARNINGS.md; promote only what changes an unrelated future project), sprint pointer cleared in `WORKSPACE.md`, this contract marked complete with a dated summary line and the measured save-to-live time from A.2.
