-- outreach_followup_templates
-- Extends `templates` to hold the three global follow-up skeletons
-- (followup_1/2/3) alongside the six per-category initials, and turns RLS on
-- for all three outreach tables (supersedes the sprint-08 "RLS disabled"
-- decision — logged in decisions/decisions.md). Server access is unaffected:
-- every route reads/writes through the service role, which the added
-- policies allow explicitly (defense in depth on top of Supabase's default
-- service_role BYPASSRLS).
--
-- Shape: a `kind` column distinguishes 'initial' (per-category, has a
-- subject + signature) from 'followup_1'|'followup_2'|'followup_3' (global —
-- one row each, category/subject_template/signature all null; the sign-off
-- already lives in the follow-up body). A shape check + two partial unique
-- indexes replace the old unique(category) constraint.

alter table templates
  add column kind text not null default 'initial';

alter table templates
  add constraint templates_kind_check
    check (kind in ('initial', 'followup_1', 'followup_2', 'followup_3'));

alter table templates alter column category drop not null;
alter table templates alter column subject_template drop not null;
alter table templates alter column signature drop not null;

alter table templates drop constraint if exists templates_category_key;

alter table templates
  add constraint templates_kind_shape_check
    check (
      (kind = 'initial' and category is not null and subject_template is not null and signature is not null)
      or (kind <> 'initial' and category is null)
    );

-- One row per category among initials; one row per kind among follow-ups.
create unique index templates_initial_category_key on templates (category) where kind = 'initial';
create unique index templates_followup_kind_key on templates (kind) where kind <> 'initial';

-- Seed the three approved follow-up skeletons (2026-07-11, Meg-approved).
-- Bodies are verbatim — do not reword. Idempotent on kind.
insert into templates (category, kind, label, audience, subject_template, body_template, signature, status, approved_at)
values
  (
    null,
    'followup_1',
    'Follow-up 1 — new fact',
    'Global follow-up sent ~28 days after the initial with no reply — leads with something new, re-asks the original question. No subject; threads onto the original message.',
    null,
    $body$Hi {{FIRST_NAME_OR_TEAM}},

{{NEW_FACT}}

It made me think of {{VENUE_SHORT}} again. {{RE_ASK_QUESTION}}

Thank you,
Meghan
megcmusic.com$body$,
    null,
    'approved',
    '2026-07-11'
  ),
  (
    null,
    'followup_2',
    'Follow-up 2 — different angle',
    'Global follow-up switching the value proposition by category, with an optional social-proof line. No subject; threads onto the original message.',
    null,
    $body$Hi {{FIRST_NAME_OR_TEAM}},

Still thinking about a night at {{VENUE_SHORT}}. {{ANGLE_LINE}}

{{SOCIAL_PROOF_LINE}}

{{DIRECT_QUESTION}}

Thank you,
Meghan$body$,
    null,
    'approved',
    '2026-07-11'
  ),
  (
    null,
    'followup_3',
    'Follow-up 3 — graceful close',
    'Global, warm zero-pressure close — door stays open, one line, EPK link. No subject; threads onto the original message.',
    null,
    $body$Hi {{FIRST_NAME_OR_TEAM}},

Last note from me. If live music ever makes sense at {{VENUE_SHORT}}, the door's open on my end. Everything's here whenever you need it: megcmusic.com/epk.

Thank you so much,
Meghan$body$,
    null,
    'approved',
    '2026-07-11'
  )
on conflict (kind) where kind <> 'initial' do nothing;

-- RLS on for all outreach tables; service_role is the only writer/reader.
alter table prospects enable row level security;
alter table templates enable row level security;
alter table messages enable row level security;

create policy service_role_all_prospects on prospects for all to service_role using (true) with check (true);
create policy service_role_all_templates on templates for all to service_role using (true) with check (true);
create policy service_role_all_messages on messages for all to service_role using (true) with check (true);
