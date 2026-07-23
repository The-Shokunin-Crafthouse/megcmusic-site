-- outreach_seed_templates
-- Seeds one email template per outreach category, status 'pending'. Meg
-- reviews, edits, and approves each on the /megs-playbook Booking Outreach tab
-- before the weekly automation may send from it. Placeholder conventions:
--   {{DOUBLE_CURLY}} — filled per-prospect by the weekly run (never on the page)
--   [SQUARE BRACKETS] — facts Meg fills/verifies before approving
--   {{PERSONAL_TOUCH}} — one human sentence per prospect; kept as the 2nd line
-- Bodies are dollar-quoted so apostrophes need no escaping. Idempotent on
-- category so re-running the migration set never duplicates a row.

insert into templates (category, label, audience, subject_template, body_template, signature)
values
  (
    'bars',
    'Bars, breweries & taprooms',
    'Owners/managers of Front Range spots that host live music',
    $subj$Live music for {{VENUE_SHORT}} — {{SUBJECT_HOOK}}$subj$,
    $body$Hi {{FIRST_NAME_OR_TEAM}},

{{PERSONAL_TOUCH}}

I'm Meghan — a Colorado singer-songwriter playing original Americana/country-folk plus a full night of covers people actually sing along to. I do solo acoustic sets sized for taproom rooms: 2–3 hours, my own PA, easy load-in, and a local following around the Front Range that shows up.

Do you book music in-house, and is there a good week coming up to try a first night? Live video and everything else in one place: megcmusic.com/epk.

Thanks,$body$,
    $sig$Meghan Clarisse Cave
Singer-songwriter · Colorado
megcmusic.com · [PHONE]
Music & EPK: megcmusic.com/epk$sig$
  ),
  (
    'corporate',
    'Corporate events & office parties',
    'Office managers / HR / event coordinators at Front Range companies',
    $subj${{COMPANY}} {{EVENT_SEASON}} event — live music that isn't a DJ$subj$,
    $body$Hi {{FIRST_NAME}},

{{PERSONAL_TOUCH}}

I'm a Colorado singer-songwriter who plays company parties and client events along the Front Range — warm acoustic sets that sit comfortably under dinner conversation and can lift into a real show after. I handle my own sound, arrive early, and keep things painless for whoever's organizing.

If you're planning {{EVENT_SEASON}} events for {{COMPANY}}, I'd love to hold a date. Samples and a one-page EPK: megcmusic.com/epk.

Best,$body$,
    $sig$Meghan Clarisse Cave
Singer-songwriter · Colorado
megcmusic.com · [PHONE]
Music & EPK: megcmusic.com/epk$sig$
  ),
  (
    'private',
    'Private parties & weddings',
    'Wedding/event venue coordinators and planners — the preferred-vendor angle',
    $subj$Acoustic live music for events at {{VENUE_SHORT}}$subj$,
    $body$Hi {{FIRST_NAME_OR_TEAM}},

{{PERSONAL_TOUCH}}

I'm Meghan, a Colorado singer-songwriter who performs at weddings and private events — ceremony sets, cocktail-hour acoustic, and first-dance requests learned per couple. I'm reliable, fully self-contained (own PA), and easy to hand to clients.

If you keep a preferred-vendor or recommended-musician list at {{VENUE_NAME}}, I'd love to be considered. EPK with live video: megcmusic.com/epk.

Warmly,$body$,
    $sig$Meghan Clarisse Cave
Singer-songwriter · Colorado
megcmusic.com · [PHONE]
Music & EPK: megcmusic.com/epk$sig$
  ),
  (
    'venues',
    'Listening rooms & step-up venues',
    'Talent buyers at 100–400-cap rooms she wants to grow into',
    $subj${{VENUE_SHORT}} + an Americana night — {{SUBJECT_HOOK}}$subj$,
    $body$Hi {{FIRST_NAME_OR_TEAM}},

{{PERSONAL_TOUCH}}

I'm a Colorado singer-songwriter — original Americana/country-folk, in the lane of [COMPARABLE ARTISTS]. I've been building a draw across Front Range rooms and I'm looking for the right listening rooms to step into next. Happy to talk support slots, songwriter rounds, or a split bill with a local act I can bring.

Live footage and numbers are in my EPK: megcmusic.com/epk. Is there a slot in the next couple of months worth a conversation?

Thanks,$body$,
    $sig$Meghan Clarisse Cave
Singer-songwriter · Colorado
megcmusic.com · [PHONE]
Music & EPK: megcmusic.com/epk$sig$
  ),
  (
    'agents',
    'Booking agents & talent buyers',
    'Agents repping multiple venues/events in Colorado',
    $subj$Colorado Americana artist for your rooms — {{SUBJECT_HOOK}}$subj$,
    $body$Hi {{FIRST_NAME}},

{{PERSONAL_TOUCH}}

I'm Meghan Clarisse Cave — Colorado singer-songwriter, original Americana/country-folk, gigging steadily across the Front Range and looking to work with an agent who books rooms like yours. I'm professional, self-contained, and easy to route: solo acoustic through full-band-feel sets, [RATE RANGE OR "rates flexible"].

One-page EPK with live video and recent dates: megcmusic.com/epk. Would 15 minutes be worth it?

Best,$body$,
    $sig$Meghan Clarisse Cave
Singer-songwriter · Colorado
megcmusic.com · [PHONE]
Music & EPK: megcmusic.com/epk$sig$
  ),
  (
    'cafes',
    'Coffee shops, wineries & restaurants',
    'Spots with acoustic-friendly rooms and daytime/early-evening slots',
    $subj$Weekend live music at {{VENUE_SHORT}}?$subj$,
    $body$Hi {{FIRST_NAME_OR_TEAM}},

{{PERSONAL_TOUCH}}

I'm Meghan, a Colorado singer-songwriter who plays rooms where people are also there to talk — volume-aware acoustic sets, 2–3 hours, my own compact PA, zero fuss. Originals plus familiar covers that fit a {{VENUE_TYPE}} afternoon.

If you host live music (or have thought about starting), I'd love to offer a date. Everything's here: megcmusic.com/epk.

Thanks,$body$,
    $sig$Meghan Clarisse Cave
Singer-songwriter · Colorado
megcmusic.com · [PHONE]
Music & EPK: megcmusic.com/epk$sig$
  )
on conflict (category) do nothing;
