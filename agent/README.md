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

  Note the Claude **desktop app does not ship the CLI** — having Claude
  installed on the Mac is not the same as having `claude` available. Install
  it with `curl -fsSL https://claude.ai/install.sh | bash` (lands in
  `~/.local/bin/claude`, no sudo), then log in interactively: run `claude`,
  `/login`, and follow the browser flow. Set `CLAUDE_BIN` to the absolute
  path in `agent/.env` — `~/.local/bin` is not on launchd's minimal PATH.
  Verify auth from a *scrubbed* environment, not just your own shell:
  `env -i HOME="$HOME" PATH="$HOME/.local/bin:/usr/bin:/bin" claude -p "say hi"`.
  A shell that inherits `ANTHROPIC_BASE_URL`/`CLAUDE_CODE_*` from a parent
  Claude session can report success where launchd would fail.
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
   output: you should see `preflight ok` → `claimed` → (`streaming` if the
   reply takes more than ~2s) → `done` (or `error`, with the reason). Check
   the job row in Supabase afterward — `status` should be `done` and
   `output` should be the validated JSON.

   **Check the exit code, not just the output** (`echo $?`):

   | Exit | Meaning |
   |---|---|
   | `0` | The queue was read successfully and, if a job ran, its outcome (`done` or `error`) reached the row. Also covers a genuinely empty queue and the disabled-by-flag no-op. |
   | `1` | Something the daemon needed didn't work: Supabase config missing, the service role key rejected, the queue read failed, or a job ran but its result could not be written back. The reason is on **stderr**, prefixed `ERROR`. |

   A queue read that fails is never reported as an empty queue — `no queued
   jobs` in the log means the query succeeded and returned zero rows, and
   nothing else. Likewise `done` is only logged once the database has
   acknowledged the write.

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

## Alternative: LaunchDaemon under a dedicated user — DOES NOT WORK

> **Superseded 2026-07-24 (decisions.md). Do not use this path.** It was
> installed and tested for real on Meghan's Mac and fails 100% of jobs. The
> `claude` CLI keeps its credentials in the macOS **login Keychain**, and a
> LaunchDaemon runs in the system bootstrap context, which cannot read any
> user's login keychain — **even while that user is logged in**. Keychain
> reachability follows the security session, not the unlock state. The
> daemon claims a job, `claude` returns the literal string `Not logged in ·
> Please run /login`, that fails `JSON.parse` on both the first attempt and
> the repair retry, and the job is marked `error` about 4.5 seconds later.
> Every launchd-level check still reports healthy while this happens —
> `launchctl list` shows the label and the log file is non-empty — which is
> exactly why those two checks alone are not proof (studio learning #45).
>
> Use the per-user **LaunchAgent** above (`install-launchd.sh`). The
> identical job that the LaunchDaemon killed completed in 13.7s under it.
> The scripts below are kept only for a hypothetical future where the CLI
> is authenticated by something the system domain can read (an env-var API
> key) — which this project deliberately does not use, since running on
> Meghan's own subscription instead of a metered key is the whole point.
>
> The reasoning that follows is left intact for the record, but its central
> premise — that a LaunchDaemon buys log-out survival — is wrong for any
> Keychain-authenticated CLI. That benefit cannot exist here.

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
   fill it in, then run `claude -p "say hi"` yourself.

   ~~This step matters beyond a sanity check: it's what unlocks Keychain
   access for whatever token store the CLI uses — a LaunchDaemon spawned
   before this first interactive login can fail to read those
   credentials.~~ **False, corrected 2026-07-24.** An interactive login
   does not grant a later system-domain daemon any Keychain access; there
   is no ordering that makes this work. Verified by doing it: the
   interactive `claude -p "say hi"` succeeded and the LaunchDaemon
   installed afterwards still could not authenticate.
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

**Tested 2026-07-24 and found broken** — see the warning at the top of this
section. The scripts themselves work exactly as written (the bootstrap
succeeds, the plist substitutes correctly, the verification prints PASS);
what fails is the daemon's ability to authenticate `claude` at all from the
system domain.

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

# Is anything actually broken? agent-error.log (stderr) holds failures only —
# agent.log is the routine narrative. Two severities, both greppable:
#   ERROR — needs a human: the daemon can't work (rejected credential,
#           unreadable queue), or a job's outcome was lost and its row is
#           stranded in 'running'.
#   WARN  — a real failure with bounded blast radius: a dropped streaming
#           partial (next sync rewrites it), or a post-processing tip write
#           (the job itself is done and valid).
grep ERROR agent/logs/agent-error.log

# Is it actually claiming jobs? Enqueue a real job via the PWA or
# POST /api/playbook/jobs, then check the row: status should move
# queued → running → (streaming) → done within a couple minutes.
```

All three — `launchctl list` shows the label, the log file has content, and
a real queued job gets claimed and completed — are the actual proof. Any
one alone (e.g. "the plist is in LaunchAgents") is not.

**A fourth check, after any change to `agent/*.mjs`: is the running daemon
actually running your code?** Node resolves its module graph once, at
process start, so a merged fix is not live until the agent is restarted —
and a stale daemon passes all three checks above as long as the jobs that
happen to run don't exercise the changed path. This bit for real on
2026-07-24: the agent started at 21:59:07 and PR #59's `onScreenText` fix
landed at 22:06, so the live process went on enforcing the old contract
while looking entirely healthy (2026-07-24 ADR).

```bash
# Compare the daemon's start time against the mtime of what it imports.
# Any source file newer than the process => the running code is stale.
ps -o lstart -p $(launchctl list | awk '/playbook-agent/{print $1}')
ls -l agent/*.mjs

# Restart onto current HEAD:
launchctl kickstart -k gui/$(id -u)/com.megcmusic.playbook-agent
```

Note the stale-contract failure mode impersonates prompt drift: it shows up
as `validation failed (attempt 1)` and a burned repair retry, which sends
you to edit `agent/prompts/*.md` or `contracts.mjs` — files that are
already correct. Check the process age first.

The first two used to be satisfiable by a daemon that could never claim
anything: with a bad `SUPABASE_SERVICE_ROLE_KEY` the claim path caught the
Supabase error and reported `no queued jobs`, exiting 0. That is fixed — a
failed queue read now logs `ERROR` to stderr and exits non-zero under
`--once` — but the shape of the lesson stands: **the last check is the only
one that proves the thing works.** Run it.

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
- **Daemon exits with code 1, "preflight: Supabase rejected the service role
  key"** — the URL and key are set, but Supabase refuses them (`Invalid API
  key`, or a `permission denied` on `generation_jobs`). The daemon checks
  this once at startup rather than discovering it on the first poll, and
  exits 1 because no amount of retrying fixes a wrong key. Re-copy the
  service role key from the Supabase dashboard (Project Settings → API) into
  `agent/.env`, and confirm the
  `supabase/migrations/20260713000000_playbook_generation_init.sql` migration
  has been applied to that project. Under launchd this crash-loops on the
  10s `ThrottleInterval` — that's the intended noise; it's visible in
  `agent/logs/agent-error.log` instead of looking idle.
- **`ERROR could not claim a job (N consecutive failures)` in
  `agent-error.log`** — the daemon is up but the queue read is failing
  (network, Supabase outage, a revoked key, a dropped table). It keeps
  retrying rather than dying, backing off from `POLL_INTERVAL_MS` by
  doubling up to a 60s ceiling, and resets to normal polling the moment a
  read succeeds. If `N` keeps climbing, the cause is on the Supabase side —
  the message carries the underlying error.
- **Job sits in `queued` forever** — the daemon isn't running at all (check
  `launchctl list`), or it crashed (check `agent/logs/agent-error.log`), or
  it can't read the queue (grep that same file for `ERROR`), or it's
  mid-backoff after a spawn failure (see below — up to ~20s before it gives
  up and marks the job `error`).
- **Job sits in `running` forever** — different failure, different cause:
  the generation finished but the write back to the row didn't. Grep
  `agent-error.log` for `failed to persist` — the `ERROR` line says whether
  the lost outcome was a `done` (the validated output is gone; re-queue the
  job) or an `error` (the reason is in that log line and nowhere else). The
  daemon does not retry the write: it has already moved on to the next job,
  and there's no way to tell a lost write from one another process made.
  Post-processing is skipped when a `done` write fails, so re-queuing won't
  double-insert tips.
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
| Supabase rejects the credential at startup | 0 | — | `ERROR` on stderr, **exit 1** (launchd respawns on its 10s throttle) |
| Queue read / claim fails (network, outage, revoked key) | unlimited (loop mode) | `POLL_INTERVAL_MS`, doubling to a 60s cap; resets on success | loop mode never gives up; `--once` logs `ERROR` and **exits 1** |
| `claude` spawn fails (ENOENT, or exits with no output at all) | 2 | 5s, then 15s | `status='error'`, `error` set |
| Model reply fails JSON.parse or schema validation | 1 (re-spawn with a repair-instruction prompt) | none (immediate) | `status='error'`, `error` set |
| CLI refuses: quota / rate limit (transient) | 3 requeues, **no repair retry** | claims paused 5min, then 15, then 30 | `status='error'` naming the limit, only after all three |
| CLI refuses: not logged in / bad key / no credit (permanent) | 0 | — | `status='error'` naming the cause + `ERROR` on stderr with the fix |
| Writing the job's `done` / `error` outcome back fails | 0 | — | `ERROR` on stderr, row stranded in `running`; `--once` **exits 1** |
| Streaming-partial write fails | next ~2s sync retries | 2s | `WARN` on stderr; cosmetic only — the final write is what matters |
| Post-processing (tip insert/deactivate) fails | 0 (best-effort) | — | `WARN` on stderr; the job stays `done` — its `output` already validated |

A single daemon processes one job at a time, claimed via a double-`.eq`
guard (`update ... where id = <id> and status = 'queued'`) so a claim never
races another process. When that guard matches zero rows (PostgREST
`PGRST116`) another worker won the race — that is idle, and the only claim
error treated as such; every other error is reported as a failure.

## Model and effort

The daemon **pins** both at the spawn site (2026-07-24 ADR) rather than
inheriting the CLI's session defaults:

```js
const CLAUDE_MODEL = "sonnet";
const DEFAULT_EFFORT = "medium";
const EFFORT_BY_KIND = { storyboard: "high" };
```

Two reasons. First, `claude -p` with no `--model` resolved to
`claude-opus-5[1m]` here — while the interactive REPL header on the same
machine showed `Sonnet 5`, so the headless and interactive defaults differ
and the app was quietly running the most expensive option against a Pro
allowance **shared with Meghan's own Claude usage**. Second, without pinning,
a `/model` or `/effort` she sets for her own work silently retunes the app,
and vice versa. Check the resolved model by reading the `stream-json` init
event, not the REPL header.

`storyboard` gets `high` because it emits the largest structure and was
observed failing `JSON.parse` on the first attempt at `medium`, surviving
only via the one-shot repair retry — a coin flip on a dead job. At `high` it
passed first try twice and was *faster end to end* (41s, 48s) than the
medium run that needed repair (89s): a repair round trip costs more than the
extra thinking. If a kind starts logging `validation failed (attempt 1)`
after a prompt or contract change, it likely outgrew its effort level —
check that before editing the prompt or the schema.

## Verified end to end on Meghan's Mac, 2026-07-24

Installed as a **LaunchAgent** (`install-launchd.sh`), running as
`meggybahn` on her own Claude Pro subscription, `claude` v2.1.219 at
`~/.local/bin/claude`:

- The `generation_jobs` / `tips` migration is applied to the live Supabase
  project (`megcmusic-outreach`, ref `lydxxqrhmlubanneepyl`) — all four
  tables verified column-by-column against the migration file. Note it is
  not recorded in Supabase's own migration ledger (applied outside the CLI),
  so `list_migrations` does not show it; the schema is nonetheless correct.
- `--once` against a real PWA-created queued row: `claimed` → `streaming` →
  `done` in 33s, output validated.
- Four of six job kinds green through the installed agent, no errors:
  `questions` (22s, 6 items), `make_it_better` (28s), `titles` (18s, 4
  `titleOptions`), `storyboard` (6 frames; see effort note above).
- `titles`' `{{FRAMES}}` placeholder works when the job carries an explicit
  `input.frames` array — the open question below is narrowed, not closed.
- All three verification criteria: `launchctl list` shows the label, the log
  has content, and a real queued job goes `queued` → `done` unattended.
- ~~The ~2s partial-output sync fired against genuine 18–33s generations (a
  `streaming` transition is in the log for several jobs), not just a
  `"pong"`-scale reply.~~ **Withdrawn 2026-07-24 — this was never true.** See
  "Partial-output streaming" below: those `streaming` lines land a few hundred
  ms before `done`, at the *end* of the generation. Nothing progressive was
  ever delivered.

## Second pass, 2026-07-24 (LaunchAgent, `claude` v2.1.219)

- **All six job kinds have now run green through the installed agent.** Added
  this pass: `tip_derivation` (20.1s) and `tip_review` (10.2s) — the two whose
  post-processing writes real rows, held back until now.
- **Tip post-processing verified at the destination, not just at `done`.**
  `tips` went 0 → 3 rows from one `tip_derivation` job, each with
  `source='post_derived'` and `derived_from_media_id` correctly stamped to the
  input post. A subsequent `tip_review` against a rule change that contradicted
  one of them flipped exactly that row to `active=false` and left the two
  merely-adjacent tips alone. No `WARN` lines on stderr for either — which is
  the part that matters, since tip writes are best-effort and a `done` job does
  not prove the tip landed.
- **The PWA renders a completed job.** Drove the real creation flow at 375×812:
  idea → `questions` job → six answers → `storyboard` job → result. The app
  polled and advanced on its own at each step.
- **A frame with no overlay text renders correctly** (the PR #59 case). A
  storyboard came back with `onScreenText: ""` on all five frames; each card
  renders description → "Asset prompt" with the "On screen" block absent —
  no empty quote marks, no orphan label, no layout gap.
- **`titles`' `input.context` fallbacks both work** — a JSON-parseable context
  string and a raw prose context string. Proven at the model, not just at
  `done`: the returned rationales cite "frame 3's on-screen text" and "the latch
  sound from frame 1" respectively. **But see the open item below — the app
  sends neither.**

## Partial-output streaming — broken 2026-07-24, fixed 2026-07-26

**Fixed.** `runClaudeProcess` now passes `--include-partial-messages` and
handles `stream_event`/`content_block_delta`. Measured after the fix: a 102.5s
storyboard wrote 7 partials (148 → 5152 chars) at the ~2s interval while
`status='streaming'`; a 16s `questions` job wrote 3. Before, both wrote none.

Note the accumulator is deliberately **two** variables — `deltaText` (deltas,
drives the progress sync) and `assistantText` (complete message, drives the
validated result). With the flag on, both arrive for the same content, so
appending them to one buffer doubles every reply and corrupts only the final
output. Don't merge them.

The original diagnosis follows, since it explains what to look for if progress
ever goes quiet again.

### Why it was broken (2026-07-24)

`runClaudeProcess` spawned without `--include-partial-messages`, so
`--output-format stream-json` framed *complete* messages: `system/init` at
0.54s, silence, then the entire assistant message as one event at 9.52s, then
`result`. The accumulator was `""` for ~88% of the run, so every ~2s tick
returned early on its own empty-string guard. Sampling a real 42s storyboard job
once a second: `output.partial` was **never** non-null and `status` went
`running → done` with no `streaming` transition at all.

The lines that looked like proof it worked were the tell, once read with
timestamps: job `42922222` logged `streaming` at 04:00:28.332 and `done` at
04:00:28.718 — 386ms apart, at the *end* of a 54-second job. **If progress ever
goes quiet again, measure the gap between the first partial and the terminal
event rather than grepping for the word `streaming`** — a status written a
fraction of a second before completion is indistinguishable from a working one
if you only check that it appeared.

## What has NOT been verified on Meghan's actual Mac

Everything in the section above is now confirmed on her machine. These are
what remain, after the 2026-07-24 install pass:

- **Restart survival.** `RunAtLoad` is set, so the agent should start at her
  next login, but a real reboot has not been exercised. If the login
  keychain is somehow unavailable after a FileVault boot, the signature is
  jobs failing fast with `Not logged in` — running `claude -p "say hi"` once
  in a terminal prompts the unlock and clears it. Still the only item that
  needs Meghan's own machine to be rebooted; everything else below is code.
- ~~**Rate limits produce dead jobs with a misleading error.**~~ **Fixed
  2026-07-26.** Refusals are now classified before validation and split by
  whether waiting helps — transient quota refusals requeue with a 5/15/30min
  claim pause (3 attempts), permanent auth refusals fail immediately naming
  the cause, and neither spends the repair retry. See the retry table above
  and the 2026-07-26 ADR. **Watch the refusal patterns** in
  `playbook-agent.mjs` if a `JSON.parse failed` error quoting English prose
  ever reappears — a reworded CLI message degrades silently back to the old
  behaviour.
  Rough per-kind cost for sizing a session: `tip_review` ~10s, `titles`
  ~7–18s, `questions` ~7–20s, `tip_derivation` ~20s, `storyboard` ~42–103s at
  `high`; one spawn per job, two when validation genuinely fails.
- ~~**`titles` never actually receives the frames.**~~ **Fixed 2026-07-26** —
  `jobInputSchemas.titles` now carries an optional `frames` array and
  `handleFreshTitles` sends it. Verified from the button: the job carries 6
  frames matching the rendered storyboard, and the returned rationales cite
  "frame 5" and "the cold-open frame" rather than generalities.
- ~~**Nothing writes to the `storyboards` table.**~~ **Corrected 2026-07-24 —
  the write path is complete and now verified.** The table was empty because
  the button had never been pressed, not because persistence was unbuilt:
  `StoryboardResult`'s "Save to library" (gated on picking a title) calls
  `useSaveStoryboard` → `POST /api/playbook/storyboards`, which inserts
  `frames`, `title_options`, `answers`, `caption` (+hashtags appended),
  `posting_window` **and `chosen_title`**. Exercised end to end this pass: one
  real storyboard saved with `chosen_title = "the porch take"`, 5 frames, 4
  title options. So the learning-loop signal everyone assumed was being thrown
  away is in fact captured the moment she saves — what is missing is anything
  that *reads* `chosen_title` back into a prompt.
- **Partial-output streaming** — see its own section above. Fix identified, not
  applied.
