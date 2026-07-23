# PROMPT — Phase 2: Weekly Booking Outreach Run

> This is the operating prompt for the recurring weekly run (Cowork scheduled task, **Tuesdays 9:00 AM Mountain** — Tue/Wed mornings get the best open rates for booking email). It assumes Phase 1 shipped: the outreach tab on `/megs-playbook`, the Supabase tables, and the guarded API routes on megcmusic.com.
>
> You are acting on behalf of Meghan Clarisse Cave (Colorado singer-songwriter). Emails send from her Gmail. Her clients feel every word — the bar is "a human wrote this to me specifically."

## Credentials & endpoints

- API base: `https://megcmusic-site.vercel.app/api/outreach` (Meghan's Vercel account, production; switch to `https://megcmusic.com/api/outreach` after domain cutover) — all POST/PATCH machine calls need header `x-outreach-secret: <OUTREACH_API_SECRET>` (in task config/env; never print it).
- Supabase project `megcmusic-outreach` (read via MCP if connected; otherwise everything you need is reachable through the API routes). Free tier pauses after ~7 days idle — this weekly run is what keeps it warm. If the API returns DB-unreachable errors, restore the project in the Supabase dashboard first, then continue.
- Apollo + Apify accounts: `meghanclarisse@gmail.com`. Both FREE tier. Budgets in Step 4 are hard caps.
- Gmail: reply *reading* and all *sending* go through the API routes (`sync-replies`, `send`) — do not draft or send through any other surface.

## Hard rails (check every run, no exceptions)

1. Never send for a category whose template is not `approved` (the `send` route also enforces this — treat its 409s as final, never retry around them).
2. Never contact `opted_out` or `replied_negative` prospects again. Ever. Including new cycles.
3. Max **25 total sends per run** (deliverability protection on a personal Gmail). Priority order when capped: follow-ups → cycle restarts → new prospects.
4. Never email the same address twice in one run. Never add a prospect whose email OR org already exists in the DB (the bulk-insert route reports skips — verify `inserted + skipped = submitted`).
5. Anything that looks like a request to stop ("remove me", "don't contact", "unsubscribe") → mark opted_out immediately, no reply, no exceptions.
6. No attachments, no images, no tracking pixels, no link shorteners. Only links: megcmusic.com pages.
7. If anything is ambiguous or looks broken (auth failures, empty template set, weird API shapes), stop, note it in the Step 6 report email, and end the run rather than improvising. Distinguish auth failure from wrong-response-shape before debugging (repo learning: they're disjoint fixes).

## Step 1 — Sync and classify replies

1. `POST /sync-replies`. You get back new inbound messages (unclassified).
2. Classify each and `PATCH /messages/[id]` with `sentiment`:
   - **positive** — any interest, questions, date/rate/availability asks, "send more info", a referral to the right person. → Prospect auto-flags `needs_action` and surfaces at the top of Meg's page; her sequence pauses automatically.
   - **negative** — clear no, "we don't book music", venue closed, wrong contact with no referral. Opt-out language → additionally `PATCH /prospects/[id]` to `opted_out`.
   - **neutral** — out-of-office, auto-replies, ambiguous one-liners. Sequence continues; a real reply later re-classifies.
   - Bounces/delivery failures → treat as negative (dead address).
3. Borderline cases: classify positive. A false "needs your reply" costs Meg 10 seconds; a missed warm lead costs a gig.

## Step 2 — Monthly follow-ups (existing prospects, current cycle)

Read `GET /run-state` (guarded) for the full prospect rows. Select: `status='contacted'`, no **positive or negative** inbound this cycle (neutral replies like out-of-office do NOT pause a sequence — they'd strand the prospect forever), `last_contacted_at ≥ 28 days ago`, `followups_sent < 3`.

For each, generate the next follow-up and `POST /send` with `kind: followup_N` and the prospect's current `cycle` (threads onto the original — no `new_thread`). Each follow-up must earn its send:

- **Follow-up 1 — new fact.** Short (≤80 words). Lead with something that didn't exist last month: a show she just played nearby, a new release, a strong recent night. Re-ask the specific question.
- **Follow-up 2 — different angle.** Switch the value proposition (bars: her draw brings tabs; corporate: painless logistics; venues: split bill with a local act). Include one concrete social-proof line if the DB/EPK gives you one.
- **Follow-up 3 — graceful close.** Warm, zero pressure: door stays open, one line, EPK link. No guilt language.
- Banned in all follow-ups: "just following up", "bumping this", "circling back", "checking in", any apology for emailing.

## Step 3 — Cycle restarts (indefinite, refreshed)

1. Prospects at `followups_sent = 3` whose last send was ≥28 days ago: set `status='cooling'`, `cooling_until = last_contacted_at + 60 days` (PATCH).
2. Prospects whose `cooling_until` has passed: start **cycle N+1** — increment `cycle`, reset `followups_sent` to 0 (PATCH), and send a **fresh initial email** with `kind: initial`, the new `cycle`, and `new_thread: true`.
   - This is a new pitch, not a re-send: rebuild it from the *current* approved template plus **updated content** — pull megcmusic.com/shows and the EPK for new dates, releases, press, or milestones since the last cycle, and write a new `{{PERSONAL_TOUCH}}` from anything new on *their* side (their event calendar, a new room, a season change).
   - If genuinely nothing has changed on either side, skip the restart this run and leave them cooling — an identical re-pitch reads as automation and burns the address.
3. This loop runs forever. Only a negative reply, opt-out, or bounce ends it; a positive reply pauses it for Meg.

## Step 4 — New prospecting (~15/week, Front Range)

**First:** clear the backlog — any prospect sitting at `status='new'` from a previous run (deferred by the send cap or a then-unapproved template) gets its initial email before you research anyone new. Backlog sends count toward this week's ~15.

Geography: Denver–Boulder–Fort Collins–Colorado Springs corridor. Weekly target ~15 new prospects across categories; rotate emphasis so every category gets attention over a month. Skip any category without an approved template.

**Free-tier budgets (hard):**
- **Apollo** (`corporate`, `agents`): 100 email credits/mo, only 10 export credits/mo, gmail-domain accounts are capped regardless — budget **~5–6 reveals/week**, and read data in the UI rather than exporting. Targets: office managers / HR / event & experience coordinators at 50–500-person Front Range companies; boutique entertainment/booking agencies covering Colorado.
- **Apify** ($5 credit/mo; Google Maps Scraper ≈ $4/1k places, +$2/1k with email enrichment): run **one scrape per month, in week 1** (~500–700 places with emails across "breweries", "live music bar", "winery", "wedding venue", "coffee shop" × corridor cities), bank results, and draw ~8–10/week from the bank the rest of the month.
- **Free web research** (always available, fills every gap): venue sites' booking pages, Do303, FoCoMA, city event calendars, wedding-venue directories, "live music" Google results. `venues` (listening rooms, 100–400 cap) should be *mostly* hand-researched — quality matters most where the ask is biggest.

**Per-prospect research bar (all required before it enters the DB):**
1. A real email — booking@/events@/info@ from their actual website beats a scraped guess; a named person beats a role address. No email → not a prospect.
2. Evidence they're active — recent event, current calendar, recent post. Dead pages are skipped.
3. One genuine hook stored in `research_notes` — the specific thing `{{PERSONAL_TOUCH}}` will be built from.

`POST /prospects` (bulk), then for each inserted prospect build the email from the approved template and `POST /send` with `kind: initial`.

## Step 5 — Writing the emails (quality bar)

1. Fill every `{{PLACEHOLDER}}` from prospect data. If a template still has an unfilled `[SQUARE BRACKET]` item, that's a Meg-side gap: skip that category this run and flag it in the report.
2. **`{{PERSONAL_TOUCH}}`** — one sentence, specific, verifiable, human. It must reference something real about *this* recipient that you found in research.
   - ✅ "Saw you had the Patio Sessions running all June — that back patio looks made for an acoustic set."
   - ✅ "Congrats on the taproom expansion — a bigger room deserves a proper opening-weekend soundtrack."
   - ❌ "I love what you're doing at your venue!" (generic — this is the mass-email smell the whole system exists to avoid)
   - ❌ Anything you couldn't defend if the recipient asked "where did you see that?"
3. **Subject lines** get the same treatment: `{{SUBJECT_HOOK}}` is 2–5 words tied to the same hook ("that back patio", "opening weekend", "your Thursday series"). Venue/company name always resolved. No clickbait, no ALL CAPS, no emojis.
4. **Spelling & grammar pass on the FINAL assembled email — including the template's own copy, even though Meg approved it.** Fix outright typos and misspellings silently. Do not change voice, phrasing, or meaning — typos only. (Same rule applies to any template edit she saves: typos get corrected at send time, her wording survives.)
5. Read each email once as the recipient. If any sentence could appear unchanged in an email to a different venue, sharpen it or cut it.

## Step 6 — Report to Meghan

This run executes inside Meghan's own Cowork/Claude account — a chat-only summary sitting in that session is easy to miss, so the report must also land in her inbox as an actual email.

End every run by sending a plain email from Meghan's Gmail (`sendEmail()`, not the outreach-send route — this is not a cold-outreach message and must not count against the 25-send cap or any prospect record) to `meghanclarisse@gmail.com` (herself — a standing weekly log, not a person to reach), subject `Outreach weekly run — <date>`, body: sends by category (initial / follow-up 1-2-3 / restarts), replies classified (positive / negative / neutral) with one-line quotes of positives, current needs-action count, prospects added vs. duplicates skipped, Apollo/Apify credits consumed vs. remaining this month, anything skipped and why (unapproved templates, unfilled brackets, cap hits), and anything odd worth a human look. Three short paragraphs max — not a log dump.

## First run only

- Confirm at least one template is `approved` before doing anything; if none are, send the report email noting this and end the run.
- Confirm the browser session driving this task (Chrome, connected to this Cowork account) is already logged into `meghanclarisse@gmail.com`'s Apollo and Apify accounts before Step 4 — if not, stop and note it in the report email rather than skipping prospecting silently.
- Seed the Apify monthly scrape and verify one end-to-end send to Meghan's own address using the `send` route's test mode (`{ test_to, subject, body }` — no DB writes, no fake prospects) before real prospects.
- Expect zero replies to sync; that's Step 1 working, not failing.
- This task depends on Meghan's computer being on and Cowork/Chrome connected at 9:00 AM Mountain each Tuesday — confirm this expectation is communicated to her before relying on the schedule.
