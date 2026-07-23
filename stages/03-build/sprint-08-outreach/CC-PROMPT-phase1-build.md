# PROMPT — Phase 1: Booking Outreach Engine (webpage build)

> Execute this prompt inside the `megcmusic-site` repo. Read it completely before writing any code.
> You are building a feature, not making decisions — every decision below is already made and logged. If something is genuinely ambiguous, stop and ask; do not improvise.

---

## 0. Context and binding rules

1. Read `WORKSPACE.md`, `CLAUDE.md` (repo adapter), and `decisions/decisions.md` first. They are binding.
2. **Tokens:** every color, font, spacing, radius, and motion value comes from `_config/design-system/token-map.css` (`--mc-*` variables). Never hardcode a hex, px spacing value, or easing curve. No Tailwind — CSS custom properties + CSS Modules only.
3. **Git:** main is branch-protected. Work on `feature/outreach-engine`, commit atomically (imperative messages), push, open a PR via `gh pr create`. Do not merge. Confirm you are in the primary checkout on an up-to-date `main` before branching (no `.claude/worktrees/` in your path).
4. **Existing page:** `/megs-playbook` (`src/app/megs-playbook/page.tsx`) is a fully static, unlinked, noindexed page rendering the social playbook from `src/data/playbook.json`. You are ADDING to this route, not replacing it. Keep its metadata/robots block, its slug, and its JSON-driven playbook rendering untouched.
5. **Protection decision (already made, do not reopen):** slug-only obscurity, no passcode. Page-facing write APIs (template approve/edit, mark-handled) are unguarded. Machine APIs that send email or bulk-write data ARE guarded by a server secret (§5). Log the residual risk in `decisions/decisions.md` (§9).

## 1. What you are building

A "Booking Outreach" tab on `/megs-playbook` where Meghan (the client) can:

- Review one email template per outreach category, **edit it inline, and approve it once**. Approved templates authorize the weekly automation (Phase 2, separate prompt) to generate personalized emails from them and send WITHOUT per-draft review.
- See replies that need her action, pinned at the top, grouped ahead of everything else.
- See the full prospect pipeline: who's been contacted, who replied positive/negative, who's in follow-up, who's cooling off.

Plus the server plumbing the weekly automation calls: Supabase tables, and API routes for sending via Gmail, syncing replies, and inserting prospects.

**Data flow:** the website is the *hands* (store, send, sync); the weekly Cowork run is the *brain* (research, writing, classification). Nothing in this build does prospecting or writes email copy beyond the seed templates.

## 2. Prerequisites (human steps — surface these to Levi as a checklist if not done; mock locally and continue)

1. **Supabase** (free tier): project `megcmusic-outreach`. Env vars in Vercel (all environments) and `.env.local`: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-only — never `NEXT_PUBLIC_`).
2. **Gmail API** for `meghanclarisse@gmail.com` (confirmed spelling). Google Cloud project on her account → enable Gmail API → OAuth client (type: Desktop app) → scopes `gmail.send` + `gmail.readonly`. Env vars: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`.
3. **Secret** for machine routes: `OUTREACH_API_SECRET` (generate 32+ random chars) in Vercel + `.env.local`.
4. `NEXT_PUBLIC_SITE_URL` must already exist in Vercel per repo learnings — verify, don't assume.
5. Apollo/Apify accounts are Phase 2 only — not needed for this build.

**Build the helper script** `scripts/gmail-auth-setup.mjs`: a run-once Node script that walks the OAuth consent flow on localhost, prints the refresh token to paste into env. Use `googleapis` (add from the project root, never inside a worktree — repo learning).

## 3. Database migration

Create via Supabase migration (name: `outreach_engine_init`). Repo learning applies: **service role needs explicit GRANT even with RLS disabled.**

```sql
create table prospects (
  id uuid primary key default gen_random_uuid(),
  category text not null,          -- one of the 6 category slugs in §4
  contact_name text,               -- person, when known
  contact_role text,
  org text not null,               -- venue / company / agency
  email text not null unique,
  city text,
  source text not null default 'web',   -- apollo | apify | web | manual
  research_notes text,             -- the hook used for personalization
  status text not null default 'new',
    -- new | contacted | replied_positive | replied_negative | opted_out | cooling
  cycle int not null default 1,          -- outreach cycle number (restarts are cycle+1)
  followups_sent int not null default 0, -- 0..3 within the current cycle
  last_contacted_at timestamptz,
  cooling_until date,              -- set when a cycle exhausts; next cycle starts after
  needs_action boolean not null default false,  -- true = Meg must reply
  gmail_thread_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table templates (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  label text not null,
  audience text not null,          -- one-line description of who this targets
  subject_template text not null,
  body_template text not null,
  signature text not null,
  status text not null default 'pending',  -- pending | approved
  approved_at timestamptz,
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references prospects(id) on delete cascade,
  direction text not null,         -- outbound | inbound
  kind text not null,              -- initial | followup_1 | followup_2 | followup_3 | reply
  cycle int not null default 1,
  subject text,
  body text,
  gmail_message_id text unique,
  sentiment text,                  -- inbound only: positive | negative | neutral
  created_at timestamptz not null default now()
);

create index on prospects (status);
create index on prospects (needs_action) where needs_action;
create index on messages (prospect_id, created_at desc);

grant all on table prospects to service_role;
grant all on table templates to service_role;
grant all on table messages to service_role;
```

RLS stays disabled (no client-side Supabase anywhere; all access via server route handlers with the service key).

## 4. Seed the six category templates (status `pending` — Meg approves on the page)

Placeholder conventions — render these literally on the page, styled as chips (§6):
- `{{DOUBLE_CURLY}}` = filled automatically per-prospect by the weekly run. Never resolved on this page.
- `[SQUARE BRACKETS]` = facts Meg must fill or verify while editing, before approving (phone, comparable artists, rates).
- `{{PERSONAL_TOUCH}}` = exactly one human, specific sentence about the recipient/venue/opportunity, written fresh per prospect by the weekly run. Every template keeps it as its second line. Do not remove it during any edit-normalization.

Shared signature (seed value for every template's `signature` column):

```
Meghan Clarisse Cave
Singer-songwriter · Colorado
megcmusic.com · [PHONE]
Music & EPK: megcmusic.com/epk
```

**Category `bars` — Bars, breweries & taprooms** (audience: owners/managers of Front Range spots that host live music)
- Subject: `Live music for {{VENUE_SHORT}} — {{SUBJECT_HOOK}}`
- Body:
```
Hi {{FIRST_NAME_OR_TEAM}},

{{PERSONAL_TOUCH}}

I'm Meghan — a Colorado singer-songwriter playing original Americana/country-folk plus a full night of covers people actually sing along to. I do solo acoustic sets sized for taproom rooms: 2–3 hours, my own PA, easy load-in, and a local following around the Front Range that shows up.

Do you book music in-house, and is there a good week coming up to try a first night? Live video and everything else in one place: megcmusic.com/epk.

Thanks,
```

**Category `corporate` — Corporate events & office parties** (audience: office managers / HR / event coordinators at Front Range companies)
- Subject: `{{COMPANY}} {{EVENT_SEASON}} event — live music that isn't a DJ`
- Body:
```
Hi {{FIRST_NAME}},

{{PERSONAL_TOUCH}}

I'm a Colorado singer-songwriter who plays company parties and client events along the Front Range — warm acoustic sets that sit comfortably under dinner conversation and can lift into a real show after. I handle my own sound, arrive early, and keep things painless for whoever's organizing.

If you're planning {{EVENT_SEASON}} events for {{COMPANY}}, I'd love to hold a date. Samples and a one-page EPK: megcmusic.com/epk.

Best,
```

**Category `private` — Private parties & weddings** (audience: wedding/event venue coordinators and planners — the preferred-vendor angle)
- Subject: `Acoustic live music for events at {{VENUE_SHORT}}`
- Body:
```
Hi {{FIRST_NAME_OR_TEAM}},

{{PERSONAL_TOUCH}}

I'm Meghan, a Colorado singer-songwriter who performs at weddings and private events — ceremony sets, cocktail-hour acoustic, and first-dance requests learned per couple. I'm reliable, fully self-contained (own PA), and easy to hand to clients.

If you keep a preferred-vendor or recommended-musician list at {{VENUE_NAME}}, I'd love to be considered. EPK with live video: megcmusic.com/epk.

Warmly,
```

**Category `venues` — Listening rooms & step-up venues** (audience: talent buyers at 100–400-cap rooms she wants to grow into)
- Subject: `{{VENUE_SHORT}} + an Americana night — {{SUBJECT_HOOK}}`
- Body:
```
Hi {{FIRST_NAME_OR_TEAM}},

{{PERSONAL_TOUCH}}

I'm a Colorado singer-songwriter — original Americana/country-folk, in the lane of [COMPARABLE ARTISTS]. I've been building a draw across Front Range rooms and I'm looking for the right listening rooms to step into next. Happy to talk support slots, songwriter rounds, or a split bill with a local act I can bring.

Live footage and numbers are in my EPK: megcmusic.com/epk. Is there a slot in the next couple of months worth a conversation?

Thanks,
```

**Category `agents` — Booking agents & talent buyers** (audience: agents repping multiple venues/events in Colorado)
- Subject: `Colorado Americana artist for your rooms — {{SUBJECT_HOOK}}`
- Body:
```
Hi {{FIRST_NAME}},

{{PERSONAL_TOUCH}}

I'm Meghan Clarisse Cave — Colorado singer-songwriter, original Americana/country-folk, gigging steadily across the Front Range and looking to work with an agent who books rooms like yours. I'm professional, self-contained, and easy to route: solo acoustic through full-band-feel sets, [RATE RANGE OR "rates flexible"].

One-page EPK with live video and recent dates: megcmusic.com/epk. Would 15 minutes be worth it?

Best,
```

**Category `cafes` — Coffee shops, wineries & restaurants** (audience: spots with acoustic-friendly rooms and daytime/early-evening slots)
- Subject: `Weekend live music at {{VENUE_SHORT}}?`
- Body:
```
Hi {{FIRST_NAME_OR_TEAM}},

{{PERSONAL_TOUCH}}

I'm Meghan, a Colorado singer-songwriter who plays rooms where people are also there to talk — volume-aware acoustic sets, 2–3 hours, my own compact PA, zero fuss. Originals plus familiar covers that fit a {{VENUE_TYPE}} afternoon.

If you host live music (or have thought about starting), I'd love to offer a date. Everything's here: megcmusic.com/epk.

Thanks,
```

## 5. API routes (App Router route handlers, `src/app/api/outreach/…`)

All Supabase access server-side with the service key via a single client helper `src/lib/api/outreachDb.ts`. Machine routes verify header `x-outreach-secret === process.env.OUTREACH_API_SECRET` and return 401 otherwise. Per repo learnings: if `trailingSlash` is ever enabled, POST routes need `skipTrailingSlashRedirect` — check `next.config.ts` (currently fine).

**Page-facing (unguarded — logged decision):**
- `GET /api/outreach/summary` → `{ templates: [...], needsAction: [prospect + latest inbound message snippet], pipeline: { replied_positive: [], replied_negative: [], in_sequence: [], new: [], cooling: [] } }`. In-sequence rows include `cycle` and `followups_sent`.
- `PATCH /api/outreach/templates/[category]` → body `{ subject_template?, body_template?, signature?, approve?: boolean }`. On `approve: true` set `status='approved'`, `approved_at=now()`. Reject approve if body no longer contains the literal string `{{PERSONAL_TOUCH}}` (422 with a human-readable message the UI shows).
- `PATCH /api/outreach/prospects/[id]` → field-level guard, one route, two callers. Without a valid secret header (Meg's page): only `{ needs_action?: boolean }` is accepted ("mark handled") — other fields in the body → 403. With `x-outreach-secret` (weekly run): additionally `{ status?, cooling_until?, cycle?, followups_sent?, research_notes? }` for opt-outs, cooling, and cycle restarts.

**Machine (guarded):**
- `POST /api/outreach/send` → `{ prospect_id, subject, body, kind, cycle, new_thread?: boolean }`, or test mode `{ test_to: "<email>", subject, body }` which sends without touching the DB (for run verification). Sends via Gmail API (`googleapis`, refresh-token auth, RFC 2822 MIME, threads follow-ups onto `gmail_thread_id` unless `new_thread`). Writes a `messages` row, updates prospect (`status='contacted'`, `last_contacted_at`, `followups_sent` when kind is a followup, `gmail_thread_id` on initial/new-thread sends). Returns gmail ids. Refuse (409) if the prospect's category template is not `approved`, if prospect status is `opted_out` or `replied_negative`, or if the same prospect was already sent `kind` in the current cycle — the route is the last line of defense, not the only one.
- `POST /api/outreach/prospects` → bulk insert `[{category, org, email, …}]`; skip on email conflict OR case-insensitive `org` match against existing rows (route-level lookup — no unique index on org, names legitimately vary). Returns `{ inserted: [...ids], skipped: [{email/org, reason}] }` so the weekly run can dedupe-verify.
- `GET /api/outreach/run-state` (guarded) → full prospect rows (all schema fields, including `id`, `last_contacted_at`, `cooling_until`, `research_notes`) for statuses `new`, `contacted`, `cooling`, plus per-prospect inbound counts for the current cycle. This is the weekly run's read surface — the page's `summary` route stays UI-shaped and lean.
- `POST /api/outreach/sync-replies` → for every prospect with a `gmail_thread_id` and status not in (`opted_out`), fetch the thread via Gmail API, find inbound messages not yet in `messages` (dedupe on `gmail_message_id`), insert them with `sentiment=null`, return them. Does NOT classify — the weekly run does.
- `PATCH /api/outreach/messages/[id]` → `{ sentiment }`; when set, also update the prospect: positive → `status='replied_positive'`, `needs_action=true`; negative → `status='replied_negative'`, `needs_action=false`; neutral → leave prospect untouched.

Every route: typed request/response, no `any`, structured error JSON. Async handlers cover the four states downstream (§6 renders them).

## 6. UI

**Structure.** `page.tsx` stays a server component with unchanged metadata. Add a client tab bar: **Social Playbook** (existing rendering, untouched) and **Booking Outreach** (`src/components/Outreach/` — component, module CSS, colocated). Persist active tab in the URL hash (`#outreach`) so Meg can bookmark it; no localStorage. The outreach tab fetches `/api/outreach/summary` on mount — the page as a whole remains statically generated.

**Tab: three sections, in this order.**

**`replied_positive` is intentionally terminal for the automation.** Once a human conversation starts, the robot stays out permanently — Meg runs that relationship from Gmail. "Mark handled" clears the flag; the prospect remains in the positive bucket as her win list. Do not build re-engage/reset controls.

1. **Needs your reply** — pinned top. Only prospects with `needs_action=true`. Card per item: org + contact, category chip, reply snippet (2-line clamp), time since reply, link "Open in Gmail" (`https://mail.google.com/mail/u/0/#all/<gmail_thread_id>`, `target="_blank" rel="noopener"`), and a **Mark handled** button (PATCH, optimistic update, revert on error). Empty state: one warm sentence, not a bare dash.
2. **Email templates** — one card per category: label, audience line, status badge (`pending` → `--mc-accent-gold`, `approved` → `--mc-teal-light` — follow the existing confidence-badge precedent in the playbook rendering, including its contrast handling). Subject, body, signature rendered read-only with `{{…}}` and `[…]` placeholders styled as small chips (background `rgba(var(--mc-accent-gold-rgb), .12)`-style composition — use existing `-rgb` triplet tokens, never hardcoded channels). Buttons: **Edit** and **Approve**. Edit swaps to textareas (subject: single-line input) inline in the card, with **Save** / **Cancel**; Save PATCHes then returns to read view. Approve PATCHes `approve: true`; surface the 422 personal-touch-missing error inline. An approved template can still be edited — editing does not reset approval (the weekly run always uses latest copy; spelling is re-checked at send time regardless).
3. **Pipeline** — grouped lists with counts, in order: Replied — positive · Replied — negative · In sequence (show `cycle N · follow-up X/3`) · Cooling off (show resume date) · New. Row: org, contact, category chip, city, last-contacted relative date. Dense table register on desktop, stacked cards under 768.

**States.** Loading (skeleton shapes matching final layout — no spinners), error (retry button), empty (written copy, e.g. "No prospects yet — the first weekly run fills this."), populated. All four, every section.

**Interaction & motion.** Five states on every control (default/hover/focus/active/disabled). `:focus-visible` uses `--mc-nav-underline` on this dark surface — logged precedent, `--mc-focus-ring` equals the page bg here. Motion: entrance/stagger via existing `--mc-entrance-*` and `--mc-ease-out` tokens; micro-interactions ≤ `--mc-motion-micro`; tab switch is a state change (~220ms), not theater; full reduced-motion path.

**Responsive & a11y.** Verify 390/768/1024/1440. Touch targets ≥44×44. Tab bar is a proper `role="tablist"` with arrow-key navigation and `aria-selected`; sections use real headings; buttons are `<button>`; AA contrast on all text including inside chips and badges.

## 7. Do not

- Do not link this route from nav, footer, sitemap, or any page. Do not weaken the robots metadata.
- Do not add client-side Supabase, Tailwind, an ORM, auth UI, or any new dependency beyond `@supabase/supabase-js` and `googleapis` (root install, committed lockfile).
- Do not touch WordPress, WooCommerce, or existing components/routes. Do not modify `src/data/playbook.json` or the playbook rendering.
- Do not build per-draft approval UI — the approved decision is approve-template-once, auto-send.
- Do not invent facts about Meghan (genre nuances, rates, phone, comparable artists) — that's what `[SQUARE BRACKETS]` are for.

## 8. Verification (all must pass before the PR)

1. `npm run build` clean; TypeScript strict, no `any`.
2. Migration applies on a fresh Supabase project; all three grants present; seed inserts 6 templates.
3. Route tests by hand (curl): guarded routes 401 without secret; approve rejects missing `{{PERSONAL_TOUCH}}`; `send` 409s on unapproved category and on `replied_negative`/`opted_out`/duplicate-kind; `prospects` bulk insert skips duplicate emails.
4. UI: all four async states reachable (mock empty/error); keyboard-only pass through tabs → edit → save → approve; reduced-motion pass; 390px pass; Gmail links open correct thread.
5. Playbook content markup renders unchanged inside its tab panel and is visually identical to the pre-change page (the surrounding tablist wrapper is the only DOM addition; visual-diff via the existing screenshots pipeline if available).

## 9. Delivery

1. Append to `decisions/decisions.md` (dated, `sc-adr` style): outreach engine added to `/megs-playbook`; Supabase free-tier DB added — a logged deviation from the "no app database" decision, scoped to outreach only (WordPress remains untouched as the site's content source); Mailchimp rejected (free tier is bulk-newsletter shaped: branding footer, list-based sends, no automation — wrong tool for 1:1 booking outreach; Gmail-native sends chosen for deliverability and human feel); approve-once/auto-send model; slug-only protection retained with unguarded page-facing writes — residual risk explicitly accepted, machine routes secret-guarded; follow-up policy: 3 monthly follow-ups → 60-day cooling → indefinite fresh-cycle restarts, negative replies and opt-outs terminal.
2. Append what you learned to `LEARNINGS.md` (repo tier).
3. PR titled `Add booking outreach engine to /megs-playbook` with a summary, env-var checklist for Levi, and screenshots at 390 and 1440. Do not merge.
