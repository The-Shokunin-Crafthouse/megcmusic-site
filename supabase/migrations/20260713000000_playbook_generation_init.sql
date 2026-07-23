-- playbook_generation_init
-- Sprint 10 Megs Playbook Redesign: the local-daemon generation queue plus
-- the tips library and the per-day checklist persistence. Four new tables:
-- generation_jobs, storyboards, tips, checklist_state. The PWA never calls
-- an LLM directly (PLAN.md §2/§5) — it writes a queued row here, a local
-- daemon on Meghan's Mac (agent/playbook-agent.mjs) polls, runs `claude -p`,
-- and streams results back. All access is server-side via route handlers
-- using the service role through src/lib/api/appDb.ts, same as every other
-- table in this project.
--
-- Posture (2026-07-12 ADR, superseding the sprint-09 "RLS disabled" default —
-- see 20260712000000_outreach_followup_templates.sql): RLS is enabled on
-- every new table with an explicit service_role policy, on top of Supabase's
-- default service_role BYPASSRLS (defense in depth). Repo learning #5: the
-- service role needs an explicit GRANT even with RLS disabled, so every
-- table is granted below regardless.
--
-- All four tables are new — no NOT NULL-on-existing-rows trap is possible,
-- but every NOT NULL column below either has a default or is required at
-- insert time by the route handler that creates the row.

create table generation_jobs (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (
               kind in (
                 'questions', 'storyboard', 'make_it_better',
                 'titles', 'tip_derivation', 'tip_review'
               )
             ),
  status     text not null default 'queued' check (
               status in ('queued', 'running', 'streaming', 'done', 'error')
             ),
  input      jsonb not null,
  output     jsonb,
  error      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Daemon poll: `select ... where status = 'queued' order by created_at`.
create index on generation_jobs (status, created_at);

create table storyboards (
  id             uuid primary key default gen_random_uuid(),
  idea           text not null,
  answers        jsonb,
  frames         jsonb not null,
  title_options  jsonb,
  chosen_title   text,
  caption        text,
  posting_window text,
  created_at     timestamptz not null default now()
);

create table tips (
  id                  uuid primary key default gen_random_uuid(),
  surface             text not null check (
                        surface in (
                          'daily_insight', 'why_this_works', 'stat_insight',
                          'booking_insight', 'checklist'
                        )
                      ),
  body                text not null,
  context_tags        text[] not null default '{}',
  source              text not null check (source in ('seed', 'post_derived', 'rule_derived')),
  derived_from_media_id text,
  active              boolean not null default true,
  times_shown         int not null default 0,
  last_shown_at       timestamptz,
  created_at          timestamptz not null default now()
);

-- Tip-of-the-day / tip-rotation selection reads active rows for a surface,
-- ordered by least-recently-shown (PLAN.md §4).
create index on tips (surface, active);

-- Per-day check-off state — survives reinstall (localStorage insufficient by
-- brief); one row per (day, item_id), upserted from the Checklist screen.
create table checklist_state (
  day        date not null,
  item_id    text not null,
  checked    boolean not null default false,
  checked_at timestamptz,
  primary key (day, item_id)
);

grant all on table generation_jobs to service_role;
grant all on table storyboards to service_role;
grant all on table tips to service_role;
grant all on table checklist_state to service_role;

alter table generation_jobs enable row level security;
alter table storyboards enable row level security;
alter table tips enable row level security;
alter table checklist_state enable row level security;

create policy service_role_all_generation_jobs on generation_jobs for all to service_role using (true) with check (true);
create policy service_role_all_storyboards on storyboards for all to service_role using (true) with check (true);
create policy service_role_all_tips on tips for all to service_role using (true) with check (true);
create policy service_role_all_checklist_state on checklist_state for all to service_role using (true) with check (true);
