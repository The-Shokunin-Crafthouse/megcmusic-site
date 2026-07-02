# Show pipeline — email → WordPress → Bandsintown

Ops tooling, not site code. Meg adds shows from her phone by emailing a short
template to a dedicated Gmail account; an unattended GitHub Action creates the
event in WordPress (draft), gets her YES, publishes, and emails her a
ready-to-upload Bandsintown CSV. WordPress remains the single source of truth.
Nobody else is in the loop — Levi hears about it only via workflow-failure
emails from GitHub.

**Code:** `scripts/show-pipeline/pipeline.mjs` (isolated deps — own
`package.json`, never installed by Vercel)
**Schedule:** `.github/workflows/show-pipeline.yml`, every 4 hours + manual
dispatch with a dry-run flag.

## The loop

1. Meg emails the pipeline address. Template (forgiving field names, one per
   line): `Date:` `Venue:` `City:` `Time:` and optional `Tickets:` `Title:`
   `Notes:` `Address:`. Online shows: `Venue: Online` + `Stream: <link>`.
2. Pipeline parses deterministically (no AI). Missing date/venue or an
   unreadable date → it replies asking, with the template. Never guesses.
3. Venue matched against existing WP venues by normalized name; created if
   new. Online shows share the single "Online" venue.
4. Duplicate guard: same day + same venue already in WP (draft or published)
   → reply "already in the system", no write.
5. Event created as **draft**; verified by reading it back. Confirm email to
   her carries the event id in the subject: `Confirm your show [MC-<id>]`.
6. Her reply (threading keeps the `[MC-id]` tag):
   - `YES` (or yep/confirm/publish) → publish, verify status stuck, then
     email the Bandsintown CSV (their Event Upload column set,
     `America/Denver`, "Live Stream" venue + stream link for online shows).
     She drags the file into artists.bandsintown.com → Events → Upload.
   - Corrected lines (`Time: 8pm-10pm`) → update the draft, re-confirm.
   - Anything else → re-ask.

## State

The mailbox is the state store. INBOX = queue; handled mail moves to
`Pipeline/Processed`. Pending confirmation lives in the `[MC-id]` subject tag.
No state files, no databases.

## Failure rules

- Any error → message stays in INBOX (retried next run), job exits non-zero,
  GitHub emails the workflow failure. Never marked handled unless the WP
  write was verified at the destination.
- Unknown senders are archived unanswered (`ALLOWED_SENDERS` in the workflow).
- The pipeline only ever emails the address that emailed it.

## One-time setup

1. Dedicated Gmail: `meghanclarisseshows@gmail.com` (created 2026-07-01). Enable 2FA,
   create an **app password** (Google Account → Security → App passwords).
   In Gmail settings → Forwarding and POP/IMAP → **enable IMAP**.
2. WP admin → Users → (Editor/Admin user) → Application Passwords → create
   one for "show-pipeline".
3. GitHub repo → Settings → Secrets and variables → Actions:
   `PIPELINE_EMAIL`, `PIPELINE_APP_PASSWORD`, `WP_APP_USER`,
   `WP_APP_PASSWORD`.
4. First run: Actions → Show pipeline → Run workflow with **dry run** ✓,
   after sending a test email to the pipeline address. Read the log, then run
   for real.
5. Send Meg the intro email (`_config/ops/meg-intro-email.md`).

## Boundaries / risks

- BIT CSV column names follow their documented Event Upload template; verify
  against a freshly downloaded template on the first real upload (their
  format may drift).
- Publishing uses TEC REST; if megcmusic.com is unreachable the run fails
  loudly and retries in 4h — same resilience posture as the site's ISR
  fetches (decisions.md 2026-06-16, bounded API calls).
- This amends "Meg manages everything in WordPress" → "…or via email; WP
  remains the store." Log via sc-adr at first live run.
