# SPRINT 14 — Launch readiness: the deploy alarm, the shop's launch gate, and the verification debt (CONTRACT)

> Filed 2026-09-14 from Levi's pick of three workstreams in one sitting ("Close the shop's launch gate", "Retroactive Gate-3 hardening", "Deploy failure notification"). They are one sprint because they share a single subject: the site is serving `megcmusic.com` from Vercel and has never been certified as launched. Branch per phase off a clean `main` (confirm `git status` first — ADR-072 main-sync).
>
> **Inputs table**
>
> | Input | Path | Why |
> |---|---|---|
> | Workspace identity | `WORKSPACE.md` | Binding rules; sprint pointer; the non-negotiables Phase 2 measures against |
> | Workflow gates | `../../../../studio-memory/WORKFLOW.md` | Stage/gate discipline; Gate 3 and Gate 4 criteria |
> | Decision log | `decisions/decisions.md` | The 2026-07-05 launch-domain ADR and its four owner-side items; the 2026-08-29 `WP_ORIGIN` ADR (cross-origin checkout is the launch behaviour); the 2026-09-14 follow-up entry |
> | The standing sign-off | `../../04-review/output/gate-4-signoff.md` | The CONDITIONAL PASS this sprint is here to resolve. Its "Blocking for launch" list and its four Not-verifiable lines are the scope |
> | Build log | `build-log.md` | Sprint 10's close: production deploys send no failure notification — the item Phase 0 takes |
> | Deploy workflow | `.github/workflows/deploy.yml` | The workflow Phase 0 instruments; read its trigger list before touching it |
> | Checkout path | `src/lib/checkout.ts`, `src/lib/wp-origin.ts`, `src/components/Shop/` | What Phase 1 verifies; the apex/www split the sign-off flagged is already gone — both derive from `WP_ORIGIN` |
> | Token map | `_config/design-system/token-map.css` | Any Phase 2 fix comes from here; no new token without a logged decision |
> | Repo learnings | `LEARNINGS.md` | The parity recipe; the `.env.local` worktree trap (#95/#238) |
> | Unit tests | `npm test` (`unit-tests.yml` on every PR) | Must stay green; Phase 0 adds none |
>
> **Resume pointer:** `SESSION-RESUME.md` at repo root (hook-owned, studio learning #164). It is **absent as of 2026-09-14** — Sprint 13's contract named it and no file exists, so either the SessionEnd hook never fired for this repo or it was cleaned. Confirm the hook writes it before relying on it to survive a crash; until then a parked phase writes its resume note into this file's phase-status line. **Turn ceilings:** Phase 0 15 turns, Phase 1 20, Phase 2 30, Phase 3 15. On hitting one: park with a resume note, open the PR as draft with what exists, stop.
>
>  **Phase status (2026-09-14):** 0 not started — **channel decided (iMessage sentinel)**, ready to build · **1.1 ✅ complete** (#128, `output/phase-1-visitor-walk.md`) · **1.2 unparked** — Levi chose option (b): **1.2a fix cart carry-over, then 1.2b place the order** · 1.3 blocked on 1.2b · 2 not started · 3 not started.
>
> **Status: IN PROGRESS.** The walk found that the shop browses but does not buy: the cart never reaches WooCommerce across the origin split, so a visitor lands on an empty cart on the old theme. Levi's calls of 2026-09-14 (logged in `decisions/decisions.md`) settle both open questions — the alarm rides the iMessage sentinel, and cart carry-over is fixed **before** the live order, which supersedes the 2026-08-29 ADR's framing of carry-over as a post-launch enhancement rather than a launch blocker. Nothing in the sprint is now waiting on a decision.

---

Project: megcmusic-site (The-Shokunin-Crafthouse/megcmusic-site) · Owner: Levi · Client: Meghan Clarisse Cave · Date: 2026-09-14 · Status: filed from Levi's three-workstream pick.

**Prime directive:** by close, `megcmusic.com` is a site someone can be told is launched. That means three things are true that are not true today: a failed production deploy wakes somebody; one real order has been placed through the live shop and its number is in the decision log; and every line the Gate-4 sign-off marks "Not verifiable" has either been verified or been recorded as a measured miss with a named owner.

## 0. Context you must load first

Read the Inputs table in order. The Gate-4 sign-off is binding as a scope document: its "Blocking for launch" list and its four Not-verifiable lines define done. Do not re-derive them.

**One correction to carry.** The sign-off's blocker 3 — DNS not cut over — is **resolved**. Verified 2026-09-14: `megcmusic.com` returns `server: Vercel`, `x-nextjs-prerender: 1`; live `/shop` hydrates all 14 WooCommerce products with correct prices and sale strikethrough; `admin.megcmusic.com/cart/` and the Store API both return 200. Blocker 4 — one real cart → Woo → PayPal order, number logged — is still open and is the only thing standing between the shop and a clean Gate 4.

## 1. Owner decisions — already made, do not reopen

1. **Checkout stays a hand-off** (2026-07-05 ADR). Lines replay into the real Woo cart via the public Store API, then the visitor is redirected to her existing Woo/PayPal checkout. No payment code, no gateway change, no secret in the front end.
2. **Cross-origin is the launch behaviour** (2026-08-29 ADR). Vercel front on the apex, WP back on `admin.megcmusic.com`, nonce unreadable across the split, so the hardened `CheckoutOriginError` notice is what a visitor sees. True in-app cart carry-over is gated on a WP CORS filter and is **not** in this sprint.
3. **The live transaction is Levi's to run** (2026-07-05 ADR, "still owner-side"). It moves real money on her live gateway. The session prepares it, watches it, and logs it; it never runs it.
4. **This is a verification sprint, not a retrofit.** Every page here was built under Gate-3 discipline in its own sprint. The four Not-verifiable lines are checks that were never *run*, not debt that was knowingly shipped. Phase 2 runs them and fixes what they find — it does not open a redesign.

## 2. Invariants

- No visual or functional change to any page except as a fix for a check that failed, and every such fix is token-driven with a logged decision.
- Content parity everywhere. Redirect suite (`/fyc`, `/shadows-of-a-ghost-town`, the admin-subdomain 301) unchanged.
- No WP core/theme edits. Never touch WooCommerce, The Events Calendar, or existing WP content destructively. Meg's published copy is hers — the session does not edit it (2026-09-11 close-out, decision 5).
- A measured miss is recorded as a measured miss. Never round a number toward the budget, never mark a line verified on a proxy for the check (learnings #181, #226 — every gate line names its producing artifact and its runner).
- Process: protected `main`, one PR per phase, ADR per locked decision (dated, supersede-never-rewrite, append-only — learning #163; union-merge the log on conflict, learning #53), LEARNINGS at close via `sc-learn`, resume pointer maintained, turn ceiling per phase.

## 3. Phase 0 — The deploy alarm

Sprint 10 closed with this open: "production deploys still send no failure notification, which is what turned a one-line lockfile problem into a five-day outage." It is still true — no workflow in `.github/workflows/` contains a `failure()` condition or any notification step. Ten consecutive red production deploys were invisible for five days once; nothing prevents a second time.

**0.1** Add a failure-only notification step to `deploy.yml`, gated `if: failure()`, naming the run URL, the trigger (`push` / `wp-content-updated` / `schedule` / `workflow_dispatch`) and the failing step. **Channel decided 2026-09-14: the iMessage sentinel** (studio learning #90's two-file contract — body written to `<base>.msg` first, then the empty trigger; a trigger with no `.msg` sends the fallback). Chosen over GitHub's own notification settings and a dedicated email address because the failure being insured against is *nobody noticed*, and both alternatives land where things already go unnoticed.

**0.2** Cover the nightly schedule run too: a scheduled deploy that fails at 3am is exactly the invisible case.

**0.3 Prove it fires** by failing a deploy on purpose in a branch — a `workflow_dispatch` run of the workflow with a deliberately broken step — and reading the notification at its destination, not at the workflow's own green checkmark (learning #45: verify at the destination, never the source's surface). A workflow that claims to notify and does not is worse than none.

**Artifacts:** `output/phase-0-alarm.md` — the diff, the forced-failure run URL, and the received notification, quoted (runner: session; the channel choice: Levi, one line).

## 4. Phase 1 — The shop's launch gate

**1.1 Verify the hand-off as a visitor, on the live apex** (runner: session). In a real browser on `megcmusic.com`: add two different products, confirm the drawer's line items, quantities and subtotal, click Checkout, and record exactly what a visitor sees. Expected per decision 1.2: the honest cross-origin notice, not an error. Screenshot at 1440 and 390. This writes a cart to her live WP session and nothing else — no order, no money.

**1.2a Fix cart carry-over first** (decided 2026-09-14 — the walk sheet's option (b); ADR logged). The Phase 1.1 walk established that the Store API write is never reached across the apex/subdomain split, so a visitor's cart never reaches WooCommerce and they land on an empty cart in the old theme. The mechanism is the WP `Access-Control-Expose-Headers: Nonce` filter the 2026-08-29 ADR already names as the escape hatch. **This is a live-service edit to her WordPress configuration** — it gets its own care, and it is verified by watching a real cart survive the hand-off, never by the filter's presence in config (learning #45). Until this clears, 1.2 does not run.

**1.2b The live transaction** (runner: Levi). One real cart → Woo → PayPal order placed from `megcmusic.com`. The session prepares `output/phase-1-live-order.md` with the steps and the fields to fill — product, total, order number, timestamps, and what the confirmation screen and the confirmation email each said. Log the order number in `decisions/decisions.md`, which the 2026-07-05 ADR explicitly asks for.

**1.3 Re-run Gate 4 on the shop** against the standing sign-off's checklist, and write the promotion: CONDITIONAL PASS → PASS, or a named, dated miss. The sign-off is not edited in place — a new dated sign-off supersedes it and says so (learning #184: supersession is a typed link, never prose alone).

**Artifacts:** `output/phase-1-visitor-walk.md`, `output/phase-1-live-order.md`, `../../04-review/output/gate-4-signoff-shop-2026-09.md`.

## 5. Phase 2 — The four checks that were never run

Each of these is a line the Gate-4 sign-off marks Not verifiable. Each needs its own artifact and its own runner. Fix what fails, from tokens, with a logged decision; record what cannot be fixed inside the sprint as a measured miss with an owner.

**2.1 Core Web Vitals, under throttling, against the production build** — not the dev server. LCP < 2.5s, CLS < 0.1, INP < 200ms (WORKSPACE.md §3). Measure on `/`, `/shop`, `/shows`, `/media` at minimum. Find the real LCP element before tuning anything (learning #65); watch CLS on every async-hydrated surface — `/shop` renders "Loading the shop…" server-side and hydrates its 14 products in the browser, which is exactly the shape learning #54 is about. **Artifact:** `output/phase-2-vitals.md`, one row per route per metric with the run's own numbers.

**2.2 Reduced motion** — toggle it at the OS level and walk every animated surface: the homepage scroll scene, the section reveals, the shop spinner, the video facade. WORKSPACE.md §3: a functional path, not a blank page. The code paths exist and have never been exercised. **Artifact:** `output/phase-2-reduced-motion.md`.

**2.3 Cross-browser** — Chrome, Firefox, Safari desktop, and iOS Safari. Gate 3 names all four; every pass to date has been Chrome only. **Artifact:** `output/phase-2-cross-browser.md`, per-browser per-route, with what differed.

**2.4 A real screen reader** — VoiceOver, live, not an accessibility-tree dump. Home, `/shop` including the cart drawer, `/shows`, the booking form. The structural passes to date read the tree; this one listens. `_config/design-system/a11y-spec.md` is what it is graded against (learning #181 — the check has a producing artifact). **Artifact:** `output/phase-2-screen-reader.md`.

**Explicitly out of scope, recorded rather than silently skipped:** load testing the server surface (studio learning #161) and query-hygiene review (#196). This site has no application database and every WordPress read happens at build on the GHA runner, so neither check has a subject here. If Phase 2.1 finds a runtime WP read on a hot path, that finding reopens this line.

## 6. Phase 3 — Close-out

The Stage-05 outputs the standing sign-off withholds — produced only once Phases 1 and 2 clear, never ahead of them. Then close-out per §7.

## 7. Stop conditions — park and report instead of improvising

Stop and surface to Levi if: the live checkout does something other than the notice decision 1.2 predicts; the real order fails, or succeeds but does not reach her Woo order list; a Web Vital misses its budget for an architectural reason rather than a tunable one (the Sprint 10 LCP shape — that is an owner scope call, not something to absorb); a screen-reader or contrast failure can only be fixed by diverging a token; or the forced deploy failure does not produce a notification. Name the blocker, what you tried, and the smallest decision needed — then stop.

## 8. Close-out

Per phase: PR merged, ADR logged, phase status line in this file updated. At sprint close: `sc-learn` (LEARNINGS.md; promote only what changes an unrelated future project), the Sprint 14 entry in `build-log.md`, sprint pointer cleared in `WORKSPACE.md`, this contract marked complete with a dated summary line carrying the live order number and the measured vitals.
