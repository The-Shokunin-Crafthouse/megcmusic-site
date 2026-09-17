# SPRINT 15 — Save-path resilience: a WordPress save must survive one slow read (CONTRACT)

> Filed 2026-09-17 from Levi's report that the dashboard's Music page "isn't linked" and that the new EPK PDF did not reach the live page. The diagnosis (`output/diagnosis.md`) found the page is linked and the PDF is live, and that the real defect is one retry-less network read failing a save-triggered rebuild. This is a hotfix sprint filed **alongside** Sprint 14 (still in progress); it does not move the `Current sprint:` pointer. Branch `fix/prebuild-fetch-retry` off a clean `main`.
>
> **Inputs table**
>
> | Input | Path | Why |
> |---|---|---|
> | Workspace identity | `WORKSPACE.md` | Binding rules; "Meg never touches code"; every content read is hers to trigger |
> | Workflow gates | `../../../../studio-memory/WORKFLOW.md` | Stage/gate discipline |
> | The diagnosis | `output/diagnosis.md` | The measured timeline, the four scripts and their read counts, the found-not-touched list |
> | Decision log | `decisions/decisions.md` | 2026-07-13 Music ADR (body not rendered by design); 2026-09-06 Phase 3 EPK ADR (fail the build loudly, previous deploy stays live) — both stay true |
> | The four prebuild scripts | `scripts/fetch-wp-content.mjs`, `fetch-releases.mjs`, `fetch-hero-images.mjs`, `fetch-fyc-assets.mjs` | The only files whose behaviour changes |
> | Deploy workflow | `.github/workflows/deploy.yml` | Read only — the `wp-content-updated` trigger is the one-shot this sprint protects |
> | Unit tests | `npm test` (`unit-tests.yml`) | Must stay green; this sprint adds the retry helper's tests and widens the glob to reach them |
> | Repo learnings | `LEARNINGS.md` | Append at close via `sc-learn` |
>
> **Turn ceiling:** 20 turns. On hitting it: open the PR as draft with what exists, park with a resume note in this file's status line, stop.
>
> **Phase status (2026-09-17):** 0 diagnosis ✅ · 1 fix ✅ (branch `fix/prebuild-fetch-retry`; tests red→green→planted-red→green; four scripts green against live WP) · 2 close-out — ADR + LEARNINGS logged; awaiting PR merge. Destination proof of a retried read in production: open, recorded when it first happens.

---

Project: megcmusic-site · Owner: Levi · Client: Meghan Clarisse Cave · Date: 2026-09-17 · Status: IN PROGRESS.

**Prime directive:** when Meg saves a site-content page, one slow answer from her WordPress host must not be enough to keep that save off the site until the next unrelated trigger. A read that fails after retrying still fails the build loudly, exactly as today.

## 0. Owner decisions — already made, do not reopen

1. **The Music page's block body stays unrendered** (2026-07-13 ADR). `/music` is built from the Releases repeater and config; body prose of six-plus words still flows through as "Liner Notes". Making the editor say so is a WordPress-side change, listed in `output/diagnosis.md` §6 for the next sprint.
2. **Prebuild reads fail the build, never render blank** (2026-09-06 Phase 3 EPK ADR). Retrying does not soften this: after the last attempt the same named cause exits non-zero and the previous deploy stays live.
3. **Meg's published copy is hers** (2026-09-11 close-out, decision 5). The EPK page's kit-row copy and the Music page's body are flagged, not edited.

## 1. Invariants

- **Scope is the four prebuild scripts, one shared helper, its tests, and the test glob.** No page, component, token, workflow, or WordPress change. No generated snapshot (`src/generated/**`, `public/images/**`) is committed with content drift — a local proof run is reverted before commit (learning #69).
- One retry policy, in one place, for every build-time WordPress read and download. Not four copies.
- A deterministic failure (a 404 on a missing slug, a non-image payload) may be retried harmlessly but must surface with its original message.
- Tests first: the helper's test fails before the helper exists, and a planted bug in the helper turns the suite red before the PR opens (learnings #230, #231).
- Process: protected `main`, one PR, the decision logged in `decisions/decisions.md` (append-only), `LEARNINGS.md` at close, `WORKSPACE.md` gets a one-line note that this sprint was filed beside Sprint 14.

## 2. Phase 1 — The fix

**1.1** `scripts/lib/retry.mjs`: `withRetry(fn, { attempts = 3, delayMs, label })` — calls `fn` up to `attempts` times, waits `delayMs` between attempts (short, growing), rethrows the last error unchanged. Pure; no fetch inside it, so it is testable without a network.

**1.2** `scripts/lib/retry.test.mjs`, written before 1.1 and run red: returns on first success; retries then succeeds; gives up after `attempts` with the last error; waits between attempts; `attempts: 1` means no retry. Widen `package.json`'s test glob so `npm test` and `unit-tests.yml` run it.

**1.3** Route every `fetch` in the four scripts through `withRetry`: the JSON reads in all four, the image downloads in `fetch-hero-images.mjs` and `fetch-fyc-assets.mjs`. `fetch-wp-content.mjs`'s own three-attempt loop is replaced by the helper so there is one policy. Messages on final failure unchanged.

**1.4 Proof.** (a) `npm test` green, and red once with a planted bug in the helper, restored. (b) Each script run locally against `admin.megcmusic.com` exits 0 (the machine reaches WordPress; the runner does too). (c) A forced transient failure — the helper wrapped around a function that throws twice then succeeds — is what the test proves; a real WordPress timeout cannot be scheduled, so the destination proof is the next save-triggered production run that logs a retried read, recorded when it happens. (d) Generated files reverted; `git status` shows only the scoped files.

**Artifacts:** the PR; `output/diagnosis.md` (Phase 0); this file's status line.

## 3. Stop conditions

Stop and surface to Levi if: a script's failure message would have to change to fit the helper; the test glob change breaks `unit-tests.yml`; or the local proof run finds a read that fails all three attempts (that is a WordPress-host problem, not this sprint's).

## 4. Close-out

PR merged; decision logged; `LEARNINGS.md` entry via `sc-learn`; the studio-promotion candidate named in the report (not written into `studio-memory` from this repo); this file's status line marked complete with the PR number.
