-- social_playbook_init
-- Sprint 09 Social Playbook Dashboard schema. Three tables: sp_posts,
-- sp_metric_snapshots, sp_sync_runs. Generation tables (recommendations,
-- idea helper) were scoped out mid-sprint — no free path to LLM auth exists
-- for a Vercel serverless route (2026-07-10 decision log); Performance and
-- Playbook tabs need no LLM dependency. RLS stays DISABLED — same posture as
-- the outreach tables (init migration): no client-side Supabase anywhere,
-- all access is server-side via route handlers using the service role
-- through src/lib/api/appDb.ts. Repo learning: the service role needs an
-- explicit GRANT even with RLS off, so every table is granted below.

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

create table sp_sync_runs (
  id          bigint generated always as identity primary key,
  kind        text not null,              -- 'sync' | 'backfill'
  status      text not null,              -- 'ok' | 'error' | 'auth_error'
  detail      text,                       -- error message / counts summary
  started_at  timestamptz not null,
  finished_at timestamptz
);

create index on sp_posts (posted_at desc);
create index on sp_posts (metrics_synced_at) where metrics_synced_at is null;
create index on sp_metric_snapshots (post_id, captured_at desc);
create index on sp_sync_runs (kind, started_at desc);

grant all on table sp_posts to service_role;
grant all on table sp_metric_snapshots to service_role;
grant all on table sp_sync_runs to service_role;
