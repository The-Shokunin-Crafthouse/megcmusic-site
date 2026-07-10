-- social_playbook_init
-- Sprint 09 Social Playbook Dashboard schema. Five tables: sp_posts,
-- sp_metric_snapshots, sp_recommendations, sp_idea_generations, sp_sync_runs.
-- RLS stays DISABLED — same posture as the outreach tables (init migration):
-- no client-side Supabase anywhere, all access is server-side via route
-- handlers using the service role through src/lib/api/appDb.ts. Repo
-- learning: the service role needs an explicit GRANT even with RLS off, so
-- every table is granted below.

create table sp_posts (
  id            text primary key,        -- Graph API media id
  platform      text not null,           -- 'instagram' | 'facebook'  (v1 syncs instagram only; column ready)
  media_type    text not null,           -- IMAGE | VIDEO | CAROUSEL_ALBUM
  product_type  text not null,           -- FEED | REELS | STORY (media_product_type)
  caption       text,
  permalink     text not null,
  thumbnail_url text,                    -- refreshed every sync; Meta CDN URLs expire
  posted_at     timestamptz not null,
  -- latest metrics (updated each sync; null = not yet fetched)
  reach               integer,
  views               integer,
  likes                integer,
  comments            integer,
  saved               integer,
  shares              integer,
  total_interactions  integer,
  metrics_available   boolean not null default true,  -- false: pre-business-conversion media etc.
  metrics_synced_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table sp_metric_snapshots (
  id          bigint generated always as identity primary key,
  post_id     text not null references sp_posts(id) on delete cascade,
  captured_at timestamptz not null default now(),
  reach integer, views integer, likes integer, comments integer,
  saved integer, shares integer, total_interactions integer
);

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

create table sp_idea_generations (
  id             uuid primary key default gen_random_uuid(),
  input          text not null,
  script_md      text not null,
  storyboard     jsonb not null,
  suggested_time jsonb not null,
  model          text not null,
  created_at     timestamptz not null default now()
);

create table sp_sync_runs (
  id          bigint generated always as identity primary key,
  kind        text not null,              -- 'sync' | 'generate' | 'backfill'
  status      text not null,              -- 'ok' | 'error' | 'auth_error'
  detail      text,                       -- error message / counts summary
  started_at  timestamptz not null,
  finished_at timestamptz
);

create index on sp_posts (posted_at desc);
create index on sp_posts (metrics_synced_at) where metrics_synced_at is null;
create index on sp_metric_snapshots (post_id, captured_at desc);
create index on sp_recommendations (batch_id, rank);
create index on sp_recommendations (status, generated_at desc);
create index on sp_idea_generations (created_at desc);
create index on sp_sync_runs (kind, started_at desc);

grant all on table sp_posts to service_role;
grant all on table sp_metric_snapshots to service_role;
grant all on table sp_recommendations to service_role;
grant all on table sp_idea_generations to service_role;
grant all on table sp_sync_runs to service_role;
