# Sprint 09 — Social Playbook Dashboard: Architecture & Design Plan

> Handoff document for the build session. Written 2026-07-10 (architecture pass, Fable).
> Surface: `/megs-playbook` (internal, unlinked, noindexed). Client work — isolated token system
> (`_config/design-system/token-map.css`), no Tailwind, no shared Shokunin design system.
> Read WORKSPACE.md, this file, and `decisions/decisions.md` (2026-07-04 playbook entries,
> 2026-07-05 outreach entry, 2026-07-10 Meta token entry) before writing code.

---

## 0. Ground truth this plan stands on

- **Meta access works.** System User token (`META_SYSTEM_USER_TOKEN`, Vercel Production + Preview) with `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`, `pages_show_list`. Page ID `108048260606098` → IG Business Account ID `17841401582839394`. Verified live 2026-07-10 (decisions.md).
- **A scoped app database already exists.** The 2026-07-05 outreach ADR added a Supabase free-tier project (`megcmusic-outreach`) as a logged, scoped deviation from "no app database" — service-role client at `src/lib/api/outreachDb.ts`, `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` already in Vercel. The prompt's "no app database currently exists" is superseded by that ADR.
- **The page and its tab shell exist.** `src/app/megs-playbook/page.tsx` (static, noindex) renders the playbook panel server-side inside `PlaybookTabs` (client tab bar, hash deep-links `#outreach`, lazy-mount-then-keep pattern).
- **`src/data/playbook.json`** — schema v1: `platforms.{instagram,facebook}.rules[]` with `id, title, rule, evidence, confidence, sources[], lastVerified`, plus `divergences`, `postingWindows`, `changelog`. A weekly Cowork scheduled task edits this JSON and opens a PR (2026-07-04 ADR — the JSON-diff contract).
- **Interaction precedent.** `src/components/Outreach/Outreach.tsx`: client orchestrator → fetch route handler on mount → four states (loading skeleton with no spinner / error with retry / written empty states / populated) → optimistic PATCH mutations with snapshot revert. `BookingForm.tsx`: input → submit → idle/submitting/error/success with inline errors and focus management.
- **No `vercel.json` exists yet** — no crons configured anywhere.
- **Gmail client** (`src/lib/api/gmail.ts`, `sendEmail()`) exists for alerting reuse.
- **Stale route:** `src/app/playbook-mcc-7k3x9f/` still exists from before the rename ADR. Delete it in this sprint (behavior-neutral cleanup commit).

### External facts verified 2026-07-10

- **IG media insights metrics (Graph API v21+):** `impressions` is deprecated; `views` replaces it. Working set per media: `reach`, `views`, `likes`, `comments`, `saved`, `shares`, `total_interactions`. Availability varies by `media_product_type` (REELS vs FEED vs STORY) — the build must verify the exact metric set per type against the live account before freezing the sync (a wrong metric name errors the whole insights call).
- **System User tokens do not expire by default.** Meta System User tokens are permanent unless generated with the optional 60-day flag. Consequence: **no refresh machinery**. Verify once in Business Settings → System Users → token details that expiry shows "Never"; if it shows a date, regenerate without the 60-day option before building anything else.
- **Vercel cron:** all plans support up to 100 crons/project; **Hobby restricts to once per day** and fires anywhere within the scheduled hour. Both jobs below are daily-or-slower, so the design works on Hobby and Pro alike.
- **Vercel KV / Vercel Postgres no longer exist as first-party products** (migrated to Upstash/Neon marketplace integrations in 2024–25). Any "Vercel KV" option would mean a new third-party account.

---

## 1. Storage decision — RESOLVED: extend the existing Supabase project

**Decision.** Store post-performance history, recommendations, and idea-generation history in the existing `megcmusic-outreach` Supabase project, new tables namespaced `sp_*` (social playbook), reached exclusively server-side through the existing service-role client. No new store, no new credentials, no new vendor.

**Why the alternatives lose:**

| Option | Verdict |
| --- | --- |
| **Existing Supabase (chosen)** | Zero new infra: client, env vars, migration pattern, and the logged "scoped app DB" precedent all exist. Relational queries are exactly what rankings, snapshots, and rate-limiting need. Free tier is far beyond this volume. |
| Static JSON regenerated on cron | A Vercel cron can't commit to the repo without a GitHub-API write + redeploy per day (build churn, and learning #69's drift trap). JSON can't answer "top 5 by computed rate with a reach floor" or append snapshot history without reading/rewriting whole blobs. Fine for the *rules* (which stay in `playbook.json`); wrong for time-series metrics. |
| Vercel KV (Upstash) / Vercel Postgres (Neon) | Both now mean a new marketplace vendor + account + env for capabilities Supabase already provides here. Neon's scale-to-zero also carries the cold-start trap (learning #83) for zero benefit at this size. |
| Vercel Blob JSON | No queries, no upsert semantics, same limitations as static JSON minus the repo history. |

**Boundary held:** WordPress remains the site's content source of truth; Supabase holds only automation state (outreach + social metrics). This is an *extension of the same scoped deviation*, not a new one — log it as an ADR referencing 2026-07-05.

**Housekeeping (own commit):** generalize `src/lib/api/outreachDb.ts` → `src/lib/api/appDb.ts` exporting `appDb()`; update the outreach imports in the same behavior-neutral commit (names are copy; the client is no longer outreach-only). Follow learning #97's lockstep-rename discipline.

**Migration rules (encode studio learnings):** every new table gets `grant all on table <t> to service_role;` in the migration (learning #5). Every unbounded read in code uses explicit `.range()` pagination (learning #84) and branches on the returned `error` (learning #85).

---

## 2. Data model

Timestamps stored UTC (`timestamptz`); day-of-week/hour derived in `America/Denver` at read time — never stored denormalized (DST would rot stored values).

### `sp_posts` — one row per post, latest metrics inline

```sql
create table sp_posts (
  id            text primary key,        -- Graph API media id
  platform      text not null,           -- 'instagram' | 'facebook'  (v1 syncs instagram only; column ready)
  media_type    text not null,           -- IMAGE | VIDEO | CAROUSEL_ALBUM
  product_type  text not null,           -- FEED | REELS | STORY (media_product_type)
  caption       text,
  permalink     text not null,
  thumbnail_url text,                    -- refreshed every sync; Meta CDN URLs expire (see §3)
  posted_at     timestamptz not null,
  -- latest metrics (updated each sync; null = not yet fetched)
  reach               integer,
  views               integer,
  likes               integer,
  comments            integer,
  saved               integer,
  shares              integer,
  total_interactions  integer,
  metrics_available   boolean not null default true,  -- false: pre-business-conversion media etc.
  metrics_synced_at   timestamptz,
  created_at    timestamptz not null default now()
);
grant all on table sp_posts to service_role;
```

`metrics_available=false` (not zeros) for media whose insights call errors permanently — IG does not serve insights for media posted before the account became a business account. Zeros would poison the rankings.

### `sp_metric_snapshots` — append-only history

```sql
create table sp_metric_snapshots (
  id          bigint generated always as identity primary key,
  post_id     text not null references sp_posts(id) on delete cascade,
  captured_at timestamptz not null default now(),
  reach integer, views integer, likes integer, comments integer,
  saved integer, shares integer, total_interactions integer
);
grant all on table sp_metric_snapshots to service_role;
```

Written each sync for posts inside the active window (§3). Enables future velocity analysis ("first-48h reach") without a schema change. Growth is trivial (≤ a few rows/day).

### `sp_recommendations` — the ranked "next post" feed

```sql
create table sp_recommendations (
  id             uuid primary key default gen_random_uuid(),
  batch_id       uuid not null,           -- one generation run
  rank           smallint not null,       -- 1..5 within batch
  summary        text not null,           -- one-line card summary
  post_type      text not null,           -- 'reel' | 'carousel' | 'story' | 'photo'
  script_md      text not null,           -- markdown: hook / beats / caption / hashtags
  storyboard     jsonb not null,          -- [{shot, direction, duration_s}]
  suggested_time jsonb not null,          -- {dow, local_time, tz:'America/Denver', rationale}
  based_on       jsonb not null,          -- {rule_ids: [], post_ids: []} — provenance
  status         text not null default 'active',  -- 'active' | 'used' | 'dismissed'
  model          text not null,
  generated_at   timestamptz not null default now()
);
grant all on table sp_recommendations to service_role;
```

The feed reads the latest batch's `active` rows ordered by `rank`. Prior batches are retained (history is cheap; a "what did it suggest last month" question stays answerable).

### `sp_idea_generations` — idea-helper history + rate-limit ledger

```sql
create table sp_idea_generations (
  id             uuid primary key default gen_random_uuid(),
  input          text not null,
  script_md      text not null,
  storyboard     jsonb not null,
  suggested_time jsonb not null,
  model          text not null,
  created_at     timestamptz not null default now()
);
grant all on table sp_idea_generations to service_role;
```

Doubles as the rate limiter: the route counts today's rows before generating (§4).

### `sp_sync_runs` — sync/generation observability

```sql
create table sp_sync_runs (
  id          bigint generated always as identity primary key,
  kind        text not null,              -- 'sync' | 'generate' | 'backfill'
  status      text not null,              -- 'ok' | 'error' | 'auth_error'
  detail      text,                       -- error message / counts summary
  started_at  timestamptz not null,
  finished_at timestamptz
);
grant all on table sp_sync_runs to service_role;
```

`auth_error` is distinct from `error` on purpose: an OAuth 190 means the token was revoked/rotated (it cannot silently expire — §3) and the dashboard says so explicitly.

### TypeScript

Types live in `src/lib/playbook/types.ts` (mirror `src/lib/outreach/types.ts` conventions). The dashboard summary payload:

```ts
type PlaybookSummary = {
  recommendations: Recommendation[];   // latest batch, active, rank asc
  topPosts: TopPost[];                 // 5 rows, precomputed rate
  lastSync: string | null;             // ISO
  lastGenerate: string | null;
  health: "ok" | "stale" | "auth_error";  // stale = last ok sync > 48h ago
};
type TopPost = {
  id: string; permalink: string; thumbnailUrl: string | null;
  caption: string | null; productType: string; postedAt: string;
  reach: number; engagement: number;   // likes+comments+saved+shares
  rate: number;                        // engagement / reach
};
```

---

## 3. Sync job architecture

### Cron topology (`vercel.json`, new file)

```json
{
  "crons": [
    { "path": "/api/playbook/sync",     "schedule": "0 8 * * *" },
    { "path": "/api/playbook/generate", "schedule": "0 14 * * 1" }
  ]
}
```

- Daily metrics sync ~overnight/early-morning Denver; weekly recommendation generation Monday morning Denver (playbook data point: Monday is the strongest posting day — recommendations land before the week starts). Hobby-plan compatible (both ≤ once daily; hour-level imprecision is irrelevant here).
- Both routes are `GET`, guarded by comparing `Authorization: Bearer ${CRON_SECRET}` (Vercel injects it automatically for cron invocations when `CRON_SECRET` is set). 401 otherwise. This mirrors the `OUTREACH_API_SECRET` machine-route precedent.

### Sync algorithm (`/api/playbook/sync`)

1. Open an `sp_sync_runs` row (`kind:'sync'`).
2. **Discover:** page `GET /{ig-user-id}/media?fields=id,caption,media_type,media_product_type,permalink,thumbnail_url,media_url,timestamp&limit=50`, following `paging.next` to exhaustion. Upsert into `sp_posts` (caption/permalink/thumbnail refresh on every run — **Meta CDN media URLs are short-lived signed URLs; refreshing `thumbnail_url` daily is what keeps Top-5 thumbnails alive**).
3. **Refresh metrics for the active window only:** posts with `posted_at > now() − 90 days`, plus any post with `metrics_synced_at IS NULL` (new or never-fetched). Engagement on posts older than 90 days is effectively frozen; skipping them keeps the run seconds-long forever, inside any function-duration limit.
4. Per post: `GET /{media-id}/insights?metric=reach,views,likes,comments,saved,shares,total_interactions` (final metric list per `product_type` frozen only after live verification — see §0). Write latest values onto `sp_posts`, append an `sp_metric_snapshots` row.
5. Every fetch wrapped in `AbortSignal.timeout(10_000)` (house rule; learnings #89 and the events-client precedent). A single failed media insight logs and continues; a failed discovery page aborts the run as `error`.
6. Close the run row (`ok`, with counts in `detail`).

**Error taxonomy:** OAuth error code 190 → `status:'auth_error'` + send a one-line alert email via the existing `sendEmail()` to Meghan's self-report address (same recipient policy as the 2026-07-05 report ADR). Anything else → `status:'error'`; the daily cadence self-heals transient failures. The dashboard surfaces `health` (§2) rather than pretending data is fresh.

**Token handling — deliberately none.** The System User token is non-expiring by design (that was the point of the 2026-07-10 ADR). There is no refresh flow to build. The failure mode is *revocation/rotation*, which is a human event, detected via 190 → `auth_error` → visible banner + email. Build-session step one: confirm the live token's expiry reads "Never" in Business Settings; if not, regenerate without the 60-day flag and update Vercel.

**Backfill** is a local script, not a cron: `scripts/playbook-backfill.ts` (pattern: `scripts/verify-apis.ts`, `node --env-file=.env.local --import tsx`). Pages the entire media history, fetches insights for everything, marks `metrics_available=false` where insights 400 with the pre-business-media error. Run once from the project root before the dashboard ships; logged as `kind:'backfill'`.

**Facebook: deferred, verify-first.** The token has `pages_read_engagement`, but FB Page post insights went through heavy metric deprecations recently; nothing in the four sections *requires* FB post metrics at v1 (the rules content covers FB). Ship IG-only sync; `platform` column and types already accommodate FB. Adding it later is a sync-module extension, not a schema change. Log as a scope line in the ADR.

---

## 4. Generation architecture (recommendations + idea helper)

Both generative surfaces run on the **Anthropic API from route handlers** — new `ANTHROPIC_API_KEY` env (Vercel Production + Preview), model `claude-sonnet-5`, called via raw `fetch` to `https://api.anthropic.com/v1/messages` (no SDK dependency needed for two call sites; keep the dependency surface flat).

**Why not the weekly Cowork run:** the run's known fragility (Meghan's machine must be awake — logged 2026-07-05) is acceptable for research but wrong for a product surface she'll open daily; and the interactive idea helper *cannot* be a scheduled run. One shared generation module serves both, so the API key is justified twice over. The weekly Cowork research task continues to own `playbook.json` *content*; the API routes own *per-account generation*. Brain/hands boundary preserved.

### Shared module `src/lib/playbook/generate.ts`

Builds one prompt context from:
1. `playbook.json` rules (v2, §5d) — the strategy substrate, with rule ids for provenance;
2. Account evidence from Supabase: top 10 and bottom 5 posts by rate (caption first-120-chars, product_type, posted local dow/hour, reach, rate) + posting-window observations once ≥ 20 scored posts exist;
3. **Upcoming shows** from the existing `getEvents()` client — recommendations can say "tease Friday's Fort Collins set" instead of generic content ideas. This is the differentiating input; the site already owns this data.
4. `postingWindows` from the JSON (fallback when account evidence is thin).

Output contract: **strict JSON** (`{summary, post_type, script_md, storyboard:[{shot,direction,duration_s}], suggested_time:{dow,local_time,rationale}, based_on:{rule_ids,post_ids}}`), validated by a hand-rolled type guard (project convention — no zod; degrade exactly like the playbook page's defensive `confidence` handling). Reject-and-retry once on invalid JSON; then fail the run.

### `/api/playbook/generate` (weekly cron)

Generates 5 ranked items → inserts one batch into `sp_recommendations`. Previous batch rows stay (`status` untouched) but the feed endpoint only serves the newest batch; "used/dismissed" state therefore resets weekly by design — a fresh week, a fresh slate.

### `POST /api/playbook/ideas` (interactive)

Body `{ idea: string }` (trimmed, 10–500 chars). Same module, plus the idea text as the brief. Inserts into `sp_idea_generations`, returns the row.

**Guardrails (this route spends money and is behind slug-obscurity only):**
- Daily cap: count today's `sp_idea_generations` rows; ≥ 20 → 429 with written copy ("The idea helper is resting until tomorrow — 20 scripts a day is the cap.").
- `max_tokens` capped (~2000); input length capped server-side; no streaming (response arrives in one piece; the UI's "writing" state covers the wait — simpler than SSE for a 10–20s single generation).
- This is a deliberate, logged exception to the "page-facing writes are unguarded" outreach posture: unguarded here would mean an open LLM-spend endpoint. The cap (not a secret header) keeps Meg's zero-friction access while bounding worst-case cost to ~20 generations/day. Log in the ADR.

---

## 5. The four dashboard sections

### Page IA — tabs

`PlaybookTabs` grows from 2 to 4 tabs. Same hash deep-link + lazy-mount-then-keep pattern:

| Tab | Hash | Content | Rendering |
| --- | --- | --- | --- |
| **Next Post** (default) | *(none)* | §a feed + §b idea helper | client, fetch on mount |
| **Playbook** | `#playbook` | §d step cards + checklist | server-rendered, static (unchanged model) |
| **Performance** | `#performance` | §c top 5 + sync health | client, fetch on mount |
| **Booking Outreach** | `#outreach` | existing | unchanged |

Default tab changes from the rules to **Next Post** — the daily-use surface leads; the reference material moves one tab over. Existing `#outreach` bookmarks keep working; the bare URL now lands on the feed (page is 6 days old; retraining cost ≈ zero — log the call). At 390px four labels exceed the row: the tab bar becomes horizontally scrollable with `scroll-snap` and edge-fade affordances (fade implemented with the existing `--mc-bg-rgb` triplet composition), roving-tabindex keyboard behavior already in place. Touch targets ≥ 44×44.

**Data plumbing (Outreach precedent, exactly):** one `GET /api/playbook/summary` returns `PlaybookSummary` (§2); the Next Post and Performance orchestrators share it via a small module-level cache or a shared parent — simplest correct: both tabs render from one `PlaybookDashboard` client orchestrator that fetches once, since PlaybookTabs keeps panels mounted. Skeletons match final layout shapes, no spinners (house style). Four states everywhere.

### a. Recommendation feed — "what should my next post be"

**Data:** `PlaybookSummary.recommendations` (≤ 5, rank order).

**Component structure:**

```
src/components/PostStudio/
  PostStudio.tsx           — orchestrator (fetch, states, mutations)
  RecommendationFeed.tsx   — list + empty/error states
  RecommendationCard.tsx   — shared with the idea helper result (§b)
  ScriptBlock.tsx          — renders script_md + storyboard shot table
  IdeaHelper.tsx           — §b
```

**Card anatomy (collapsed):** rank ordinal (Lora display numeral — the show-card date-pick precedent for typographic weight), one-line `summary`, post-type chip (existing chip/tint pattern via `--mc-teal-rgb` composition), suggested time in humane copy ("Monday · 5–7 pm"), disclosure affordance.

**Interaction — inline expand:** the card is a `<button aria-expanded>` disclosure controlling a region (`aria-controls`/`role="region"`, labelled by the summary). Expanded content: full script (hook / beats / caption / hashtags from `script_md`), storyboard as a numbered shot list (shot · direction · duration), suggested-time rationale, and two actions — **Mark as used** / **Dismiss** — optimistic PATCH to `/api/playbook/recommendations/[id]` with snapshot revert on failure (clone `markHandled` in `Outreach.tsx`). Dismissed cards leave the list; used cards stay with a quiet "used" state (her week's record). Height animation uses grid-rows or measured max-height at `--mc-reveal-duration`; `prefers-reduced-motion` → instant toggle, opacity only. Only one card expanded at a time is *not* enforced — she may compare two scripts.

**Empty state (pre-first-generation):** written copy, not a blank: "No recommendations yet — the first batch generates Monday morning. Ask the idea helper below in the meantime."

### b. Idea helper — describe an idea, get a script

**Interaction (BookingForm + Outreach hybrid, per the referenced flow):** single labelled `<textarea>` ("Describe the post you're thinking about") + submit ("Write it up"). States: idle → generating (button disabled + textarea readonly, skeleton card in the result slot with `aria-busy` + polite live-region announcement "Writing your script…") → success (result renders as a `RecommendationCard`, pre-expanded, focus moved to the card heading — deferring focus with rAF per learning #64) → error (inline message + retry, **input preserved**). 429 renders the cap copy as a distinct, friendly state, not an error tone.

**Result:** same card component and script/storyboard shape as §a — one visual grammar for "a post you could make." Below the input, a "Recent ideas" list (last 5 from `sp_idea_generations`, collapsed cards) so a script she generated Tuesday is still there Thursday.

**Route:** `POST /api/playbook/ideas` (§4). No optimistic write (there's nothing to predict); plain pending state.

### c. Top 5 all-time — reach-normalized engagement

**Definition (freeze in code + a UI footnote):** `rate = (likes + comments + saved + shares) / reach`, computed in the summary route's SQL, **posts with `reach ≥ 100` and `metrics_available = true` only** — tiny-reach posts produce garbage rates (3 likes / 20 reach "outperforms" everything). The floor is a named constant, footnoted in the UI ("among posts that reached 100+ accounts").

**Component:** `src/components/PostStudio/TopPosts.tsx` (rendered in the Performance tab). Ranked rows 1–5: rank numeral, thumbnail (44px+, `object-fit: cover`, square — the /media grid precedent), caption first line, product-type chip, posted date, then the numbers: rate (headline, e.g. "6.2%"), reach and engagement (supporting). Whole row is a stretched link to `permalink` (target _blank — it leaves the site for instagram.com; stretched-link pattern per the show-card ADR). Thumbnail `onError` → typed placeholder tile (pick motif on `--mc-bg-card`), never a broken-image glyph — CDN URLs are refreshed daily (§3) but a same-day expiry stays graceful.

**Sync health strip** above the list: last sync time + `health` state. `stale` → quiet notice line; `auth_error` → visible banner ("Instagram connection needs attention — data paused since ⟨date⟩") using the established red-ink/gold status tokens. This is the §45/#59 verification surface: the dashboard never silently shows old numbers as current.

### d. Best-practice rules → step cards + pre-publish checklist

**Schema change — `playbook.json` v2** (`meta.version: 2`). Per rule, add two authored fields; keep everything else:

```jsonc
{
  "id": "ig-01",
  "action": "Build the Reel around a moment a fan would DM to one friend",  // NEW — imperative, ≤ 90 chars
  "rule": "…",          // unchanged (the operating rule)
  "insight": "…",       // NEW — 1–2 sentence *why*, distilled from `evidence`
  "evidence": "…",      // retained (deep detail behind the card)
  "confidence": "high",
  "sources": [...],     // rendered as "Go deeper" links
  "lastVerified": "2026-07-04"
}
```

Plus top-level `checklist`: ordered items `{ id, label, ruleIds[] }` — the pre-publish ritual distilled from the rules (watermark check, no caption URL, no engagement bait, hook in first 1.5–3s, save-worthy element, send-worthy moment, posting window). Content authoring for `action`/`insight`/`checklist` happens in this sprint (Levi/Claude authored, from existing `evidence` text — no new research needed; **no lorem, ever**).

**Coordination item (blocking for the weekly loop, not for the build):** the weekly Cowork research task's prompt must be updated to the v2 shape (maintain `action`/`insight` when rules change, never drop `checklist`). Until then it would emit v1-shaped edits. Levi owns the task prompt update; the ADR records it.

**Card anatomy:** platform-grouped (IG / FB sub-sections, existing ★★★ SectionLabel motif). Each card: `action` as the headline (this is the step — what you *do*), `rule` as body, `insight` as a quiet distinguished paragraph (italic Newsreader, the quote-surface precedent), confidence badge (existing teal-light/gold/red-ink mapping), "Go deeper" source links (external, underlined, focus-visible via `--mc-nav-underline` — this page's logged focus exception). `evidence` sits behind a small disclosure ("evidence") for the days she wants the receipts — same reduced-motion-safe disclosure primitive as §a (build it once: `src/components/PostStudio/Disclosure.tsx` or co-located equivalent).

**Pre-publish checklist:** its own card at the top of the tab. Real `<input type="checkbox">` elements (custom-styled, five states, 44×44 touch targets), ephemeral state with a "Reset" button — it's a per-post ritual, deliberately not persisted (a pre-checked checklist is a lie). Progress line ("4 of 7") in text, not a progress bar (slop-blocklist). Each item links to its rule card via `ruleIds` (anchor scroll + `:target` highlight).

This panel stays **server-rendered and static** exactly like today (JSON import at build; ISR/redeploy on JSON merge) — the checklist checkboxes are the only client island (`Checklist.tsx`).

---

## 6. Quality bar (Gate 3 — hold throughout, verify with sc-verify before presenting)

- **Tokens only.** Every value from `token-map.css`. Anticipated additions (log via the token-additions ADR pattern if used): none required by this plan — spacing (8pt `--mc-space-*`), type ramp, radii, reveal/motion durations, status colors, chip tints, and the focus exception all exist. If the disclosure animation needs a dedicated duration distinct from `--mc-reveal-duration`, that's one new token, logged.
- **Five states** on: tab buttons (exists), disclosure cards, Mark-used/Dismiss, textarea, submit, checklist boxes, source links, top-post row links.
- **Keyboard:** tabs (roving, exists), disclosures (Enter/Space), checklist, focus moved to idea result on success; focus-visible everywhere via the page's logged `--mc-nav-underline` exception.
- **Reduced motion:** disclosure + skeleton pulse + any entrance reveal all gate off; functional path identical.
- **AA:** all new text on dark surface uses existing passing pairs; rate/reach numerals at body size use `--mc-text-*` ramp; status banner uses `-ink` variants for text (learning #56).
- **CLS:** skeletons match final shapes; thumbnails have fixed square boxes; below-fold sections of a tab render hidden until data resolves (learning #54).
- **States of async:** idle/loading/error/empty on every fetch surface — written empty copy, no blank panels.
- **Responsive:** 390 / 768 / 1024 / 1440 verified; tab-bar scroll behavior at 390; cards single-column ≤ 768.

---

## 7. New env + infra (all Vercel Production + Preview)

| Item | Value |
| --- | --- |
| `META_SYSTEM_USER_TOKEN` | exists (verify expiry = Never) |
| `ANTHROPIC_API_KEY` | **new** — generation routes |
| `CRON_SECRET` | **new** — Vercel-injected cron auth |
| `vercel.json` | **new** — two crons (§3) |
| Supabase migration | `sp_posts`, `sp_metric_snapshots`, `sp_recommendations`, `sp_idea_generations`, `sp_sync_runs` + grants |
| `.env.local.example` | document all of the above |

---

## 8. Decisions to log via sc-adr (drafted here, capture after review)

1. **Storage:** social-playbook state extends the existing scoped Supabase project (`sp_*` tables) — extends the 2026-07-05 deviation, WordPress boundary intact; Vercel KV/Postgres rejected (now third-party marketplace vendors), static/Blob JSON rejected (no queries, cron-commit churn).
2. **Generation:** Anthropic API (`claude-sonnet-5`) from route handlers for both surfaces; weekly-Cowork-run generation rejected (uptime fragility, and interactivity requires a route anyway). New `ANTHROPIC_API_KEY` infra + per-day cost, bounded.
3. **Idea-route guardrail:** daily cap (20) via `sp_idea_generations` count — a logged exception to the "page-facing writes unguarded" outreach posture because this write spends money.
4. **Token posture:** non-expiring System User token, zero refresh machinery; 190 → `auth_error` + email alert + dashboard banner (verify-at-destination discipline, learnings #45/#59).
5. **Sync shape:** daily cron, 90-day active metric window, local one-off backfill script; every fetch bounded 10s.
6. **Facebook post metrics deferred** — verify-first; IG-only v1 with `platform` column ready.
7. **`playbook.json` schema v2** (`action`/`insight`/`checklist`) + the weekly research task prompt must move to v2 (Levi coordination item).
8. **Tab IA:** four tabs, Next Post becomes default; `#outreach` untouched; scrollable tab bar at mobile.
9. **Thumbnails:** Meta CDN URLs refreshed each sync; `onError` typed placeholder.
10. **Cleanup:** delete the stale `src/app/playbook-mcc-7k3x9f/` route.

## 9. Build order (for the Sonnet session)

1. Housekeeping commit: `outreachDb` → `appDb` rename (lockstep, behavior-neutral); delete stale route.
2. Migration + types + `appDb` grants; run against Supabase.
3. Meta client (`src/lib/playbook/meta.ts`): media paging + insights, bounded fetches, error taxonomy. **Verify live metric names per product_type first** (a throwaway script call, then freeze the metric list).
4. Backfill script; run it; confirm rows + `metrics_available` flags look sane in Supabase.
5. `/api/playbook/sync` + `vercel.json` + `CRON_SECRET`; verify one manual invocation end-to-end.
6. Summary route + Performance tab (§c) — ships value with zero LLM dependency.
7. Generation module + `/api/playbook/generate` + Next Post feed (§a).
8. `/api/playbook/ideas` + IdeaHelper (§b).
9. `playbook.json` v2 authoring + step cards + checklist (§d); tab IA change last (the moment the page's default view changes).
10. sc-verify Gate-3 pass; sc-adr capture; PR (protected main — learning #43).

## 10. Open items / verify-first flags

- Exact insights metric set per `media_product_type` against the live account (§0) — freeze before building the sync.
- Live token expiry shows "Never" (§3).
- Vercel plan (Hobby vs Pro) — design is Hobby-safe either way; only affects cron hour precision.
- Insights history depth for pre-business-conversion media — backfill will reveal; `metrics_available` absorbs it.
- Whether STORY media should be synced at all (24h lifespan, thin insights) — default: exclude STORY from sync v1; include FEED + REELS + CAROUSEL. Flag to Levi if stories matter to her workflow.
