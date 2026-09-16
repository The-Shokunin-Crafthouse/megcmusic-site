# Phase 0 — The deploy alarm

**Sprint:** 14 (launch readiness) · **Phase:** 0 · **Date:** 2026-09-14
**Contract:** `stages/03-build/sprint-14-launch-readiness/CONTEXT.md` §3
**Channel decided by:** Levi, 2026-09-14 (`decisions/decisions.md` — Sprint 14 owner calls, decision 1)

---

## 1. What was wrong

No workflow in `.github/workflows/` carried a `failure()` condition or any
notification step. Ten consecutive red production deploys once stayed invisible
for five days (build-log, Sprint 10 close) — a one-line lockfile problem became
a five-day outage because nothing said anything.

## 2. What was built

The alarm is two halves, because one half cannot do the job alone.

**Producer — `.github/workflows/deploy.yml`, step `Alarm on failure`.**
Gated `if: failure()`, it opens an issue labelled `deploy-failure` naming the run
URL, the trigger, the failing step and the commit. Because it is a step in the
one job every trigger runs, it covers all four: `push`, `repository_dispatch`
(`wp-content-updated`), the nightly `schedule` at 09:00 UTC, and
`workflow_dispatch`. §0.2's invisible case — a 3am scheduled failure — needs no
separate handling; it is the same step.

**Consumer — `studio-memory/automation/deploy-alarm-watch.sh`.**
On the Mac, every 5 minutes off `main-sync.sh`, it reads open `deploy-failure`
issues, writes the two-file iMessage sentinel, and closes the issue so a failure
is texted exactly once.

### Why the runner does not just send the text

The sentinel is a Mac-local file drop: `send-briefing.sh` polls
`ai-site/_pending/` and sends over osascript → Messages. A GitHub runner can
reach neither — `_pending/` is not in any repo (only `.gitkeep` is tracked) and
`osascript` does not exist on Linux (learnings #86, #90). The issue is the
handoff, and it is also the durable buffer: a failure that lands while the Mac
is asleep is still open and waiting when it wakes. Nothing is lost, only late.

### Why it rides main-sync instead of bringing its own launchd job

A launchd job added to an installer after that installer last ran is never
loaded (learning #87). `main-sync.sh` is already a loaded LaunchAgent firing
every 300s, and launchd re-reads the script from disk on every firing — so the
relay was live the moment the file existed, with no install step to forget. Its
exit status is discarded in `main-sync.sh` so the alarm can never take checkout
hygiene down with it.

### The two-file contract, held

Learning #90: the body goes to `<base>.msg` **first**, the empty trigger
**second**; a trigger with no `.msg` silently sends a generic fallback that
looks like success. The relay writes `.msg`, refuses to arm at all if `.msg`
came out empty, then writes `.no-reply` (ADR-043 — the alarm asks nothing) and
the 0-byte trigger last. It verifies the trigger is present and empty before
stamping its ledger.

---

## 3. The diff

### `.github/workflows/deploy.yml`

```diff
diff --git a/.github/workflows/deploy.yml b/.github/workflows/deploy.yml
index 6d0c75a..b69991f 100644
--- a/.github/workflows/deploy.yml
+++ b/.github/workflows/deploy.yml
@@ -27,6 +27,13 @@ concurrency:
   group: production-deploy
   cancel-in-progress: false
 
+# The alarm below opens an issue. Spelled out rather than left to the repo
+# default so a tightened org default surfaces as a failed step, not a silent
+# alarm that never fires.
+permissions:
+  contents: read
+  issues: write
+
 jobs:
   deploy:
     runs-on: ubuntu-latest
@@ -57,3 +64,81 @@ jobs:
         run: vercel deploy --prebuilt --prod --token="$VERCEL_TOKEN"
         env:
           VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
+
+      # --- Failure alarm (Sprint 14 Phase 0) -----------------------------
+      # Ten consecutive red production deploys once stayed invisible for five
+      # days (build-log, Sprint 10 close) because no workflow here carried a
+      # `failure()` condition. This step is the PRODUCER half of the alarm: it
+      # opens a labelled issue naming the run URL, the trigger, and the step
+      # that failed.
+      #
+      # It does not text anyone itself, and cannot: the iMessage sentinel is a
+      # Mac-local file drop (`ai-site/_pending/`, polled by send-briefing.sh),
+      # unreachable from a GitHub runner, and osascript does not exist here
+      # (learnings #86, #90). The CONSUMER half is
+      # `studio-memory/automation/deploy-alarm-watch.sh`, which runs on the Mac
+      # every 5 minutes off main-sync, relays the issue over the two-file
+      # sentinel contract, and closes it so a failure is texted exactly once.
+      #
+      # The issue is also the durable record: a 3am scheduled failure that lands
+      # while the Mac is asleep is still open and waiting when it wakes.
+      #
+      # `if: failure()` covers every trigger this workflow has — push,
+      # repository_dispatch wp-content-updated, the nightly schedule, and
+      # workflow_dispatch — because it is a step in the one job they all run.
+      - name: Alarm on failure
+        if: failure()
+        env:
+          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
+          REPO: ${{ github.repository }}
+          RUN_ID: ${{ github.run_id }}
+          RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
+          EVENT: ${{ github.event_name }}
+          DISPATCH_TYPE: ${{ github.event.action }}
+          SHA: ${{ github.sha }}
+          REF: ${{ github.ref_name }}
+        run: |
+          set -uo pipefail
+
+          # The trigger, in the vocabulary the workflow header uses.
+          case "$EVENT" in
+            repository_dispatch) TRIGGER="repository_dispatch (${DISPATCH_TYPE:-unknown type})" ;;
+            schedule)            TRIGGER="schedule (nightly 09:00 UTC, ~2-3am Denver)" ;;
+            *)                   TRIGGER="$EVENT" ;;
+          esac
+
+          # The failing step, read back off the run. The job's own conclusion is
+          # still null while this step is executing, so select on the STEP
+          # conclusion across every job rather than on the job's.
+          FAILED_STEP="$(gh api "repos/$REPO/actions/runs/$RUN_ID/jobs" \
+            --jq '[.jobs[].steps[]? | select(.conclusion == "failure") | .name] | first // empty' \
+            2>/dev/null)"
+          [ -n "$FAILED_STEP" ] || FAILED_STEP="unknown — no step had reported a failure conclusion yet"
+
+          # printf, not a heredoc: an unindented EOF terminator cannot live inside
+          # an indented `run:` block, and an indented one never terminates.
+          BODY="$(printf '%s\n' \
+            "Production deploy failed. Nothing was deployed; the previous production deploy is still live." \
+            "" \
+            "- **Run:** $RUN_URL" \
+            "- **Trigger:** $TRIGGER" \
+            "- **Failing step:** $FAILED_STEP" \
+            "- **Commit:** \`${SHA:0:7}\` on \`$REF\`" \
+            "" \
+            "Opened by the \`Alarm on failure\` step in \`.github/workflows/deploy.yml\`." \
+            "\`deploy-alarm-watch.sh\` relays this to iMessage and closes it. If this issue is" \
+            "still open and no text arrived, the relay is what broke — not the deploy.")"
+
+          # The label is the consumer's only selector, so create it if absent
+          # rather than letting a missing label drop the issue on the floor.
+          gh label create deploy-failure \
+            --repo "$REPO" \
+            --color B60205 \
+            --description "A production deploy failed — relayed to iMessage by deploy-alarm-watch.sh" \
+            2>/dev/null || true
+
+          gh issue create \
+            --repo "$REPO" \
+            --title "Production deploy failed — run $RUN_ID" \
+            --label deploy-failure \
+            --body "$BODY"
```

### `studio-memory` (separate PR)

- **new** `automation/deploy-alarm-watch.sh` — the relay.
- **edit** `automation/main-sync.sh` — calls the relay after each sync, exit
  status discarded, absence logged loudly.

---

## 4. Proof it fires

Per §0.3 and learning #45, proved by failing a deploy on purpose and reading the
notification at its destination — not at the workflow's own checkmark.

**Forced-failure run:** <https://github.com/The-Shokunin-Crafthouse/megcmusic-site/actions/runs/34930197322>
(`workflow_dispatch` on `sprint-14-phase-0-deploy-alarm`, commit `969558c`, which
carried a deliberate `--deliberately-broken-flag-phase-0` on the Build step and
was reverted immediately after.)

**The Build step was broken, not the Deploy step, so nothing live was touched.**
Step conclusions from that run:

```
success  Set up job
success  Run actions/checkout@v4
success  Run actions/setup-node@v4
success  Install Vercel CLI
success  Pull Vercel environment (production)
failure  Build
skipped  Deploy to production      <- never ran
success  Alarm on failure
```

### 4.1 Producer fired

Issue **#131** — <https://github.com/The-Shokunin-Crafthouse/megcmusic-site/issues/131>:

> Production deploy failed. Nothing was deployed; the previous production deploy is still live.
>
> - **Run:** https://github.com/The-Shokunin-Crafthouse/megcmusic-site/actions/runs/34930197322
> - **Trigger:** workflow_dispatch
> - **Failing step:** Build
> - **Commit:** `969558c` on `sprint-14-phase-0-deploy-alarm`

All three things §0.1 asked for — run URL, trigger, failing step — are read back
off the run, not guessed. The failing step is queried from the jobs API on the
step conclusion rather than the job's, because the job's own conclusion is still
null while the alarm step is executing.

### 4.2 Relay fired — from launchd, proved by runtime artifact

Not from the plist being present (learning #87), but from the log the run wrote:

```
2026-09-14 22:49:15  megcmusic-site#131: relayed — coo.notify-deploy-failed-megcmusic-site-131-2026-09-14 armed (669 bytes of body)
2026-09-14 22:49:17  finished — 1 open failure issue(s), 1 newly relayed
```

The issue creation (22:48) to relay (22:49:15) gap was under one `main-sync`
interval. Issue #131 is now **CLOSED**, commented "Relayed to iMessage by
`deploy-alarm-watch.sh`."

### 4.3 The sentinel, written to contract

```
-rw-r--r--  0 bytes  coo.notify-deploy-failed-megcmusic-site-131-2026-09-14
-rw-r--r--  669      coo.notify-deploy-failed-megcmusic-site-131-2026-09-14.msg
-rw-r--r--  0 bytes  coo.notify-deploy-failed-megcmusic-site-131-2026-09-14.no-reply
```

Non-dotfile, ends in the date, no reserved routing word, trigger 0 bytes, `.msg`
non-empty. The body queued for the phone:

```
DEPLOY FAILED — megcmusic-site · 2026-09-14 22:49

Production deploy failed. Nothing was deployed; the previous production deploy is still live.

- **Run:** https://github.com/The-Shokunin-Crafthouse/megcmusic-site/actions/runs/34930197322
- **Trigger:** workflow_dispatch
- **Failing step:** Build
- **Commit:** `969558c` on `sprint-14-phase-0-deploy-alarm`

Opened by the `Alarm on failure` step in `.github/workflows/deploy.yml`.
`deploy-alarm-watch.sh` relays this to iMessage and closes it. If this issue is
still open and no text arrived, the relay is what broke — not the deploy.

Issue: https://github.com/The-Shokunin-Crafthouse/megcmusic-site/issues/131
```

### 4.4 The destination read — PENDING LEVI

`send-briefing.sh` polls every 900s and stamps `<base>.sent` when it has sent.
That stamp is still `send-briefing`'s own claim about itself — the source
surface. The destination is the phone, and only Levi can read it.

**CONFIRMED 2026-09-15 by Levi**, reading his own phone: the text arrived and
shows the FULL body, including the run URL, the trigger, the failing step and
the issue link. Not the generic fallback ("Shokunin automation: … completed.
Check claude agents.").

That is the destination read the whole proof rests on. Everything between a
failed production deploy and a phone is now exercised, end to end, by a real
failure — not inferred from any step's own green checkmark.

One cosmetic defect visible in the delivered text and worth naming rather than
leaving for someone to notice later: the body is written in Markdown and iMessage
renders none of it, so the `**Run:**` asterisks and backticks arrive literally.
The text is entirely legible and every fact reads correctly; it is ugly, not
broken. Fixing it means the relay strips Markdown on the way into `.msg` — a
change to `deploy-alarm-watch.sh`, not to `deploy.yml`. Deliberately not done
here: it is a cosmetic edit to the one path that was just proved working, and it
belongs in its own change where it can be re-proved by another forced failure.

**FIXED 2026-09-16** — studio-memory ADR-089 and PR #359. `deploy-alarm-watch.sh`
now strips Markdown on the way into `.msg`; `deploy.yml` was not touched, because
the issue body's other reader is github.com, where the Markdown is correct. The
stripper recognises bold, inline code and link syntax, keeps bare URLs untouched,
and degrades to passing a line through unchanged rather than dropping it — it is
never keyed to one body's shape, since the relay is generic across repos
(studio-memory learning #245).

Re-proved the way this section demands, by a second forced failure: run
`35118079041`, `workflow_dispatch` on a throwaway `alarm-markdown-strip-reprove`
branch, commit `67b8365`, again breaking **Build** and never Deploy —
`failure Build`, `skipped Deploy to production`. `main` never moved and the
branch was deleted once the relay had run. Issue #143's Markdown body relayed at
641 bytes against this run's 669; the text reached the phone at 10:05 and **Levi
read it at 10:33**: plain, no asterisks, no backticks, both the run URL and the
issue URL bare and tappable, full body rather than the generic fallback.

### 4.5 The send path fired — stamp landed 23:02

```
-rw-r--r--  0 bytes  coo.notify-deploy-failed-megcmusic-site-131-2026-09-14.sent   (23:02)
```

`send-briefing.sh` saw the trigger and stamped `.sent` 13 minutes after the relay
armed it — inside one 900s poll interval. End to end, the chain measured:

| | |
|---|---|
| 22:48 | run 34930197322 fails at Build; `Alarm on failure` opens issue #131 |
| 22:49:15 | `deploy-alarm-watch.sh` relays it; sentinel armed; issue closed |
| 23:02 | `send-briefing.sh` stamps `.sent` |

So: **~14 minutes from a failed production deploy to a sent text**, worst case
bounded by the 900s send poll rather than by anything in the alarm.

The stamp still only proves `send-briefing` believes it sent. It is the source
surface — the same surface learning #45 says never to accept. The destination
read below is unchanged and still open.

---

## 5. What this does not cover

- **A deploy that never starts.** The alarm is a step inside the job; a run that
  is never queued (a broken cron, a disabled workflow) fires nothing. A
  liveness check on the nightly deploy is a separate, later job.
- **The Mac being off for a long stretch.** The issue stays open and the text is
  late, not lost — but it is late.
- **Other workflows.** `preview-deploy.yml`, `show-pipeline.yml`,
  `wp-migrate.yml` and `wp-ops.yml` still carry no `failure()` condition. Phase 0
  scoped the alarm to production deploys; the rest is a named gap, not an
  oversight.
