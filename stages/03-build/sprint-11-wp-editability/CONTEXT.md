# SPRINT 11 — Total WordPress Editability Overhaul (CONTRACT)

> Filed 2026-08-29 from Levi's approved contract of 2026-08-28. This file IS the sprint contract — binding, verbatim below the rule. Sprint artifacts land in this folder; phases land as PRs per §2.
>
> **Inputs table**
>
> | Input | Path | Why |
> |---|---|---|
> | Workspace identity | `WORKSPACE.md` | Binding project rules; sprint pointer |
> | Workflow gates | `../studio-memory/WORKFLOW.md` | Stage/gate discipline |
> | Decision log | `decisions/decisions.md` | Prior decisions incl. 2026-08-28 FYC entry (superseded by this contract) |
> | Repo learnings | `LEARNINGS.md` | Bluehost/WP failure modes (2026-08-27 entries), Vercel CI-only deploys, ISR timeouts |
> | Project brief | `megcmusic-project-brief.md` | Locked architecture |
> | Token map | `_config/design-system/token-map.css` | Untouchable except where data source changes |
> | Content sources | `src/config/*.ts`, `src/app/**/page.tsx` | Audit subjects |
>
> **Resume pointer:** see `SESSION-RESUME.md` at repo root (hook-owned).
> **Phase status:** Phase 0 in progress (audit + mapping). Gate: Levi approves inventory + ACF field design before any build.

---

CONTRACT — Total WordPress Editability Overhaul

Project: megcmusic-site (The-Shokunin-Crafthouse/megcmusic-site) Owner: Levi (Shokunin Crafthouse) · Client editor: Meghan Clarisse Cave Date: 2026-08-28 · Status: Approved by Levi — execute Prime directive: After this contract ships, every piece of CONTENT a visitor sees on megcmusic.com is editable by Meg from her WordPress dashboard (admin.megcmusic.com/wp-admin), and her saved edit is live on the site within ~3 minutes — with ZERO change to the site's design, layout, motion, URLs, or current content.

## 0. Context you must load first

Read in order: `WORKSPACE.md`, `../studio-memory/WORKFLOW.md`, the active sprint `CONTEXT.md`, `decisions/decisions.md`, `LEARNINGS.md`, `megcmusic-project-brief.md`. File this contract into the repo per the workspace's sprint convention and update the `Current sprint:` pointer as your first commit.

Why this contract exists: the 2026-06 brief locked a headless-WordPress architecture — WP is the CMS, the Next.js site renders it. Shows (The Events Calendar), shop (WooCommerce), booking, and the music release pages honor that. Newer surfaces drifted into repo-held content: `src/config/fyc.ts` (both FYC campaigns), `src/config/discography.ts` + `src/config/releases.ts` (registries), home-page copy, EPK/media/poetry copy, and any other hardcoded prose you find. Meg opened her dashboard to edit the FYC page and it wasn't there. That is the defect. This contract eliminates the entire class.

## 1. Owner decisions — already made, log as ADRs at kickoff, do not reopen

1. Editing model: ACF structured fields. Install Advanced Custom Fields (free) on the existing WP install. Each site surface appears in Meg's dashboard as a WordPress page with named, plain-language field boxes (with help text). Field groups are the editing UI Meg sees — design them for a non-technical musician, and present the full field-group design at the Phase-0 gate.
2. Publish speed: rebuild on save, ~2–3 minutes. A WP-side hook pings GitHub on publish/update of any site-content page; the site rebuilds and deploys automatically. Debounce 60s so a burst of saves = one build.
3. Scope: all visitor-facing content, except Meg's Playbook (an app, stays as is) and the cart/checkout transactional flow. Shows/shop/booking already run from WP — verify, don't rebuild.
4. Edit existing surfaces only. Meg edits every current page; creating brand-new site pages remains a studio task. No generic page-builder template.
5. Supersession: this supersedes the 2026-08-28 decision that moved FYC campaign content into `src/config/fyc.ts`. Record it in `decisions/decisions.md` as a dated superseding entry linking the superseded one (supersede, never rewrite). Harvest anything still useful from that work (the build-time media fetcher pattern, the parity checks) before deleting.

## 2. Invariants — violating any of these fails the contract

* Pixel parity. The rendered site before and after is visually identical at 390/768/1024/1440/1920 on every route. Proof is full-page screenshot pairs diffed and reviewed per route (size the viewport to the page; compare scrollHeight first to catch dropped sections), not a claim.
* Content parity. Rendered text content per route is diff-identical before/after migration. Metadata, OG tags, canonical URLs unchanged. All existing redirects still live (test `/fyc`, `/shadows-of-a-ghost-town`, and the admin-subdomain 301).
* No design-system change. Tokens, CSS Modules, motion, components untouched except where a component's data source changes. `sc-hygiene` drift check must pass.
* WordPress stays healthy. No WP core or theme edits. Additions limited to: ACF (free), and ONE small custom plugin (Section 4). Never touch WooCommerce, The Events Calendar, or existing WP content destructively. Remember the Aug 27 outage: abandoned plugins fataling on admin hooks took down wp-admin — everything you add must be PHP-8.3-clean, tiny, and versioned in the repo.
* Fail loudly, never blankly. A build that cannot read WP fails with a named cause; the previous deploy stays live. A missing field renders as "section absent by content" ONLY when WP explicitly returns it empty — a fetch failure is never rendered as an empty section.
* Process: protected `main`, one PR per phase (or per surface in Phase 3), ADR per locked decision via `sc-adr`, LEARNINGS at close, resume pointer maintained so a crashed session can continue. Every phase has a turn ceiling — if you hit it, park with a resume note and stop; never grind.

## 3. Phase 0 — Audit and mapping (GATE: Levi approves before any build)

Deliverable: a content inventory table committed to the sprint folder. For every route (`/`, `/shows`, `/shows/[slug]`, `/music`, `/music/[slug]`, `/media`, `/poetry`, `/epk`, `/booking`, `/shop`, `/shop/[slug]`, `/fyc/[slug]`, and any others found), list every content element → its current source (WP-already / repo config file+line / hardcoded JSX) → its target WP home (existing WP page content, existing WP entity, or named ACF field on a named WP page) → migration action.

Also in Phase 0, verify empirically and record in the table's header:

* Which network contexts reach `admin.megcmusic.com/wp-json/*` reads: your sandbox (previous session's egress proxy denied this domain — have Levi allow `megcmusic.com` + `admin.megcmusic.com` in the Claude Code sandbox network settings BEFORE starting; if still blocked, stop and say so), the GitHub Actions runner (known good), and the Vercel runtime. Note: Bluehost 409-blocks `wp-login`/`wp-admin`/`admin-ajax` from datacenter IPs but `/wp-json` has been reachable — verify reads AND authenticated writes separately; a 401/403/409 and a wrong-shaped 200 are different failures, diagnose from raw responses.
* Whether ACF fields appear in REST (`?acf_format=standard` / `acf/v3`) once installed.

Draft the complete ACF field-group design (per page: field names, types, labels, help text, gallery fields for image sets like the 11 FYC lyric sheets). Present inventory + field design together at the gate.

## 4. Phase 1 — WordPress side

Build in-repo under `/wp-plugin/megc-site-content/` (source committed, versioned, with its ACF field-group JSON):

* Registers the ACF field groups from local JSON (so field definitions are code-reviewed, not click-configured), exposed to REST.
* On `save_post`/`acf_save_post` of site-content pages: debounced (60s) POST to GitHub `repository_dispatch` (event `wp-content-updated`) using a fine-grained PAT with contents:read + actions on this repo only. PAT and repo name live in `wp-config.php` constants — never in the plugin file or the database.
* Degrades silently if constants are absent; no admin-hook fatals possible (guard every hook; the outage class is known).

Named human gate (the only unavoidable ones): installing ACF + uploading this plugin + adding the two `wp-config.php` constants happens in Bluehost wp-admin/File Manager from a residential IP — Levi or Meg does the clicking with your exact step list, or you drive it via the local Chrome browser tools with Levi present to log in. Levi creates the PAT. Nothing else in this contract may be handed to a human.

## 5. Phase 2 — Content migration INTO WordPress

Source of truth for every value: the current live site (not the repo, not the old WP page — the live rendered content is what parity is measured against). Write current content into the new ACF fields via authenticated WP REST (application password). If authenticated REST writes are blocked from your context, fall back in order: run the writes through the local browser session, or generate a WordPress import file (WXR) with exact instructions. Media held only in the repo or fetched at build (e.g. the FYC lyric sheets in `public/images/fyc` / `scripts/fetch-fyc-assets.mjs`) is uploaded INTO the WP media library so Meg manages images where she always has. After migration, verify at the destination: read every field back over REST and diff against the live site's content.

## 6. Phase 3 — Rewire the site, one surface per PR

Replace each repo-held content source with a build-time WP/ACF REST read. Order: FYC campaigns (the page that started this), then EPK, media, poetry, home-page copy, discography/release registries, then anything else the inventory found. Rules: every fetch has `AbortSignal.timeout` and a retry; extend shared response shapes, never swap them; keep each superseded config file until its replacement PR ships green, then delete it in that PR (carrying over its tests); image fields resolve through the existing build-time media pattern (download at build, validate bytes, fail loudly) rather than hotlinking WP. `/fyc` retarget and nav stay as shipped.

## 7. Phase 4 — Publish pipeline

Extend `deploy.yml` with the `repository_dispatch` trigger (production build on `wp-content-updated`). Add a nightly scheduled production rebuild as self-healing for any missed ping. Prove the loop end to end and screenshot it: a real edit in Meg's dashboard → live on megcmusic.com, timed; the contract's ~3-minute promise is measured, not assumed.

## 8. Phase 5 — Parity proof and Gate 3

Per route: before/after full-page screenshot pairs at all five breakpoints, reviewed (not just captured); rendered-text diff empty; metadata diff empty; redirect suite green; interaction states and reduced-motion unaffected; `sc-hygiene` drift + deadcode pass (deleted config proven unused). Attach all of it to the final PR. Do not merge anything that lacks its proof.

## 9. Phase 6 — Meg's guide + close-out

A one-page, plain-language guide for Meg: where each site page lives in her dashboard, what each field does, how long until her edit is live, and what to do if it doesn't appear (wait, re-save, then tell Levi). Deliver as PDF for Levi to send AND as a dashboard-visible note if trivially possible. Close out: ADRs logged, LEARNINGS appended, sprint pointer cleared, this contract marked complete with a dated summary line.

## 10. Stop conditions — park and report instead of improvising

Stop and surface to Levi if: WP REST writes are blocked from every available context; ACF cannot expose a needed structure via REST; Bluehost blocks the dispatch ping; parity cannot be achieved on a surface without a design change; or anything requires touching WooCommerce/TEC/checkout. Name the blocker, what you tried, and the smallest decision needed — then stop.
