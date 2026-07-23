# Megs Playbook — local generation daemon

This is the generation engine behind Meghan's `/megs-playbook` PWA. The PWA
never calls an LLM API directly — a route handler writes a `queued` row to
the Supabase `generation_jobs` table, and this daemon (running on
**Meghan's own Mac, on her own Claude Code subscription**) polls for it,
runs `claude -p`, and writes the validated result back. Same pattern as
Levi's health dashboard; it's how the product gets a real LLM without a
metered API key or a server-side subscription cost.

Two files make up the daemon:

- `playbook-agent.mjs` — the poll loop, prompt assembly, `claude -p`
  process management, output validation, and post-processing.
- `contracts.mjs` — a plain-JS mirror of `src/lib/playbook/generation.ts`'s
  zod **output** schemas. Duplicated (not imported) because the daemon is
  ESM `.mjs` and cannot import this project's TypeScript sources. **If you
  change an output shape in `generation.ts`, you must change it here too —
  they are meant to drift together, not apart.**

## Prerequisites

- **Claude Code CLI installed and logged in** on the Mac that will run the
  daemon (`claude` on `PATH`, or set `CLAUDE_BIN` to its absolute path).
  Verify with `claude -p "say hi"` in a normal terminal first — if that
  doesn't work, nothing here will either.
- **Node 20.12+** (the daemon uses `process.loadEnvFile`, added in that
  release). Check with `node --version`.
- The repo cloned locally, with root dependencies installed (`npm install`
  at the repo root — the daemon resolves `@supabase/supabase-js` and `zod`
  from the root `node_modules`, it does not have its own).

## Setup

1. **Copy the env template and fill it in:**

   ```bash
   cp agent/.env.example agent/.env
   ```

   Edit `agent/.env`:
   - `PLAYBOOK_AGENT_ENABLED=1` — the daemon is a clean no-op unless this is
     exactly `1` (positive default-off flag — studio learning #73).
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — same Supabase project as
     the Next.js app's own `.env.local` (see `.env.local.example` at the
     repo root). This is a **server-only service role key** — `agent/.env`
     is gitignored and must never be committed or shared.
   - `CLAUDE_BIN` — usually fine left as `claude`. Set an absolute path if
     `command -v claude` in a normal terminal shows something not on the
     minimal PATH launchd jobs get (common with nvm/homebrew installs).
   - `POLL_INTERVAL_MS` — leave at the default (`5000`) unless you have a
     reason to change it.

2. **Install root dependencies** (if you haven't already):

   ```bash
   npm install
   ```

3. **Test with `--once` against a real queued job**, before installing the
   background service. From the app (or a script), enqueue a job — e.g. via
   `POST /api/playbook/jobs` with `{"kind":"make_it_better","input":{"idea":"..."}}`
   — then run:

   ```bash
   node agent/playbook-agent.mjs --once
   ```

   This processes at most one `queued` job and exits. Watch the console
   output: you should see `claimed` → (`streaming` if the reply takes more
   than ~2s) → `done` (or `error`, with the reason). Check the job row in
   Supabase afterward — `status` should be `done` and `output` should be
   the validated JSON.

4. **Install as a background service (launchd):**

   ```bash
   bash agent/install-launchd.sh
   ```

   This copies `com.megcmusic.playbook-agent.plist` into
   `~/Library/LaunchAgents/`, substituting the real repo path and the
   resolved `node` path for the `__REPO__` / `__NODE__` placeholders in the
   committed template, then bootstraps it so it starts now and on every
   login. **Re-running the script is safe** — it replaces the existing
   registration cleanly.

   To remove it: `bash agent/uninstall-launchd.sh`.

## Alternative: LaunchDaemon under a dedicated user (running on Levi's Mac)

**Decided 2026-07-13** (decisions.md) — Meghan's own laptop (Windows, 8GB
RAM, 11th-gen i3) isn't a good fit for this. Instead: a second macOS user
account on Levi's Mac, logged into **Meghan's own Claude subscription**,
running the daemon as a system-wide **LaunchDaemon** rather than the
per-user LaunchAgent above.

Why a LaunchDaemon and not the LaunchAgent instructions above run under
that second account: a LaunchAgent lives in the `gui/<uid>` domain and
only runs while that user has an active session. Fast User Switching
(switching away without logging out) keeps it alive; a full log-out does
not — and nobody's going to remember to never log that account out. A
LaunchDaemon runs in the system-wide `system` domain and doesn't care
whether that user is logged in at all.

Setup:

1. Create the second macOS user account (System Settings → Users &
   Groups). Log into it at least once, interactively.
2. **While logged into that account**, do the normal setup: clone the
   repo (into that user's own home directory, not the admin's — the
   daemon runs as this user and needs to read/write `agent/.env` and
   `agent/logs/`), `npm install`, `cp agent/.env.example agent/.env` +
   fill it in, then run `claude -p "say hi"` yourself. This step matters
   beyond a sanity check: it's what unlocks Keychain access for whatever
   token store the CLI uses — a LaunchDaemon spawned before this first
   interactive login can fail to read those credentials.
3. Test with `node agent/playbook-agent.mjs --once` against a real queued
   job, same as the LaunchAgent flow.
4. Install Node **system-wide** (Homebrew: `brew install node`), not via
   nvm under the admin's own home — a per-user nvm install is invisible
   to the second account's LaunchDaemon process.
5. From an admin shell (can be either account, just needs `sudo`):
   ```bash
   sudo bash agent/install-launchdaemon.sh <macos-username>
   ```
   Mirrors `install-launchd.sh`'s runtime-artifact verification
   (`launchctl list` + non-empty log file, printed PASS/FAIL), but
   installs into `/Library/LaunchDaemons/` with a `UserName`/`GroupName`
   pair set to the target account instead of `~/Library/LaunchAgents/`.
   The script checks the target user can actually execute the resolved
   `node` binary before installing, and warns if the repo isn't owned by
   that user.
   Remove with `sudo bash agent/uninstall-launchdaemon.sh`.

Trade-off worth knowing: this moves the "is the daemon awake" dependency
from Meghan's machine to Levi's, and her Claude Code login now lives on
his laptop rather than hers. Accepted 2026-07-13 given her hardware.

**Untested as of this writing** — built and syntax/plist-checked in the
studio's dev environment (`bash -n`, `plutil -lint`, all pass), but the
actual `sudo bash agent/install-launchdaemon.sh` bootstrap, the Keychain
unlock, and a real `--once` run under the second account have not been
run on Levi's actual Mac.

## Verification

Never trust that a launchd job is running just because the plist exists
somewhere (studio learning #45 — a source app's/file's presence isn't proof
of delivery; verify at the destination) — `install-launchd.sh` checks
runtime artifacts itself and prints PASS/FAIL, but you can re-check by hand:

```bash
# Is it loaded?
launchctl list | grep com.megcmusic.playbook-agent

# Is it actually producing output? (should be non-empty within a few seconds
# of install/reboot — even a disabled agent logs one line before exiting)
tail -n 20 agent/logs/agent.log
tail -n 20 agent/logs/agent-error.log

# Is it actually claiming jobs? Enqueue a real job via the PWA or
# POST /api/playbook/jobs, then check the row: status should move
# queued → running → (streaming) → done within a couple minutes.
```

All three — `launchctl list` shows the label, the log file has content, and
a real queued job gets claimed and completed — are the actual proof. Any
one alone (e.g. "the plist is in LaunchAgents") is not.

## Troubleshooting

- **`ENOENT` / "spawn claude ENOENT"** — the daemon can't find the `claude`
  binary. Run `command -v claude` in a normal (non-launchd) terminal and set
  `CLAUDE_BIN` in `agent/.env` to that absolute path. launchd jobs run with
  a minimal environment and do not inherit your shell's PATH, nvm shims, or
  homebrew paths the way an interactive terminal does.
- **Daemon exits immediately with "agent disabled"** — either
  `PLAYBOOK_AGENT_ENABLED` isn't set to exactly `1` in `agent/.env`, or
  `agent/.env` doesn't exist. This is the *expected* behavior when unset —
  it's a clean no-op by design, not a bug. Copy `agent/.env.example` and set
  the flag.
- **Daemon exits with code 1, "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are
  not set"** — the flag is on but the Supabase values are missing/blank in
  `agent/.env`. Double-check there's no stray quoting or trailing space.
- **Job sits in `queued` forever** — the daemon isn't running at all (check
  `launchctl list`), or it crashed (check `agent/logs/agent-error.log`), or
  it's mid-backoff after a spawn failure (see below — up to ~20s before it
  gives up and marks the job `error`).
- **Job goes to `error` with "claude spawn failed after retries"** — the
  daemon retries a failed `claude` spawn twice with backoff (5s, then 15s)
  before giving up and erroring the job. This covers a transient failure to
  even start the process (ENOENT, or exiting before producing any output);
  it does **not** retry a job whose model reply just failed validation —
  that's a separate, one-shot repair path (next item).
- **Job goes to `error` with "Validation failed after repair retry"** — the
  model's JSON didn't match the job kind's contract (`contracts.mjs`). The
  daemon already tried once more automatically: on the first validation
  failure it re-spawns `claude -p` with the *original* prompt plus a repair
  instruction naming the exact validation error, asking for corrected JSON
  only. Only a second failure errors the job. If this keeps happening for a
  given job kind, the prompt file (`agent/prompts/<kind>.md`) or the
  contract (`contracts.mjs` / `generation.ts`) likely drifted — compare them
  by hand.
- **Repeated "PLAYBOOK_AGENT_ENABLED is not '1'" lines every ~10s in the
  log** — this is launchd's `KeepAlive: true` respawning the process after
  each clean disabled-exit, throttled to once per 10s
  (`ThrottleInterval: 10`) so it doesn't thrash. Expected if you installed
  the launchd job before finishing `agent/.env` setup; harmless, but fix
  `agent/.env` so it isn't spinning forever.

## Retry / backoff semantics, summarized

| Failure | Retries | Backoff | Outcome after retries exhausted |
|---|---|---|---|
| `claude` spawn fails (ENOENT, or exits with no output at all) | 2 | 5s, then 15s | `status='error'`, `error` set |
| Model reply fails JSON.parse or schema validation | 1 (re-spawn with a repair-instruction prompt) | none (immediate) | `status='error'`, `error` set |
| Post-processing (tip insert/deactivate) fails | 0 (best-effort) | — | logged only; the job stays `done` — its `output` already validated |

A single daemon processes one job at a time, claimed via a double-`.eq`
guard (`update ... where id = <id> and status = 'queued'`) so a claim never
races another process.

## What has NOT been verified on Meghan's actual Mac

This was built and syntax/contract-checked in the studio's dev environment,
including a real end-to-end `claude -p --output-format stream-json --verbose`
smoke test and a `contracts.mjs` validation pass against the project's
committed mock fixtures (`src/app/megs-playbook/__fixtures__/*.json`) — but
the following are **untested against a real queued row in the live
Supabase schema and untested on Meghan's own machine**, and should be
confirmed during her onboarding:

- The `generation_jobs` / `tips` tables from
  `supabase/migrations/20260713000000_playbook_generation_init.sql` had not
  been applied to the project's live Supabase database as of this build —
  `--once` could not be run against a real row here. Confirm the migration
  has landed before Meghan's first run.
- `launchd` install/verify (`install-launchd.sh` / `uninstall-launchd.sh`)
  — the plist substitution and `plutil -lint` validity were dry-run tested
  here, but the script was not actually bootstrapped into a live
  `launchctl` session (this is a shared dev machine, not Meghan's Mac —
  installing a real background job here would be the wrong target).
- `claude` CLI auth state on Meghan's Mac, and whether her subscription's
  rate limits comfortably cover the daemon's usage pattern.
- Real-world timing of the ~2s partial-output sync against an actual
  30s–2min generation (only a `"pong"`-scale reply was exercised live here).
- The `titles` job's `{{FRAMES}}` placeholder: the page-facing input schema
  for `titles` in `generation.ts` is still being extended by a concurrent
  sprint step as of this writing (currently `idea` + optional `context` +
  optional `previousTitles`, no dedicated `frames` field yet). The daemon
  reads `input.frames` if present, else tries to `JSON.parse` `input.context`,
  else falls back to the raw `context` string — this should be re-checked
  once that UI step lands its final shape.
