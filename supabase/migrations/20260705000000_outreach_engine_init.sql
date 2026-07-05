-- outreach_engine_init
-- Booking Outreach Engine schema (Phase 1). Three tables: prospects,
-- templates, messages. RLS stays DISABLED — there is no client-side Supabase
-- anywhere; all access is server-side via route handlers using the service
-- key. Repo learning: the service role needs an explicit GRANT even with RLS
-- off, so every table is granted below.

create table prospects (
  id uuid primary key default gen_random_uuid(),
  category text not null,          -- one of the 6 category slugs
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
