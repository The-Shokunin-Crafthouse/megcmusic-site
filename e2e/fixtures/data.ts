/**
 * Hand-authored fixtures for surfaces that have no committed generation
 * fixture (tips / recommendation / posts / outreach / checklist /
 * storyboards). The four generation-job fixtures
 * (questions/storyboard/make_it_better/titles) are the real committed ones
 * at src/app/megs-playbook/__fixtures__ — imported directly in mocks.ts so
 * the mocked jobs API and the daemon's `MOCK_GENERATION=1` fixture output
 * never drift apart.
 */

import type { TipSurface } from "@/lib/playbook/generation";

// ---------------------------------------------------------------------------
// Tips — bodies differ per surface, and each surface has 2+ bodies so a
// stateful GET handler can rotate through them (tip-rotation.spec.ts).
// ---------------------------------------------------------------------------
export const TIP_BODIES: Record<TipSurface, string[]> = {
  daily_insight: [
    "Reels with a spoken hook in the first 2 seconds hold 30% longer than text-only openers.",
    "Posts that name a specific venue or city out-reach generic tour-life posts by about 2x.",
  ],
  why_this_works: [
    "Behind-the-scenes framing has outperformed polished performance clips on your Reels this quarter.",
    "A single specific detail (a place, a date, a name) reads as more trustworthy than a general claim.",
    "Fans comment more on posts that ask an implicit question than ones that only state a fact.",
  ],
  stat_insight: [
    "This one's reach is well above your recent median for this format.",
    "Reels still out-reach static posts for you by a wide margin this month.",
  ],
  booking_insight: [
    "Venues reply fastest to emails sent Tuesday–Thursday mornings.",
    "A specific date range in the first line gets a reply 2x more often than an open-ended pitch.",
  ],
  checklist: [
    "A caption with a clear ask outperforms one that only describes the post.",
  ],
};

// ---------------------------------------------------------------------------
// Recommendation (Home "Your Next Post" + weekly plan)
// ---------------------------------------------------------------------------
export const RECOMMENDATION_FIXTURE = {
  headline: "Backstage before Friday's show",
  detail:
    "Film the 20 minutes before you go on — the string lights, the tuning, the nerves. That's the post fans keep asking for.",
  seedIdea:
    "A behind-the-scenes look at my pre-show ritual before Friday's set at The Skylark Lounge.",
  whyTags: ["behind-the-scenes", "pre-show"],
  weekly: [
    {
      day: "Wed",
      window: "5–7pm",
      headline: "Studio session teaser",
      seedIdea: "A quick clip from today's writing session.",
    },
    {
      day: "Fri",
      window: "6–8pm",
      headline: "Show night countdown",
      seedIdea: "Countdown to tonight's set at The Skylark Lounge.",
    },
    {
      day: "Sun",
      window: "11am–1pm",
      headline: "Sunday reflection post",
      seedIdea: "A quiet reflection on the week's shows.",
    },
  ],
};

// ---------------------------------------------------------------------------
// Posts (Stats screen + Home "Last Post")
// ---------------------------------------------------------------------------
export const POSTS_FIXTURE = [
  {
    id: "post-1",
    permalink: "https://instagram.com/p/post-1",
    thumbnailUrl: null,
    caption: "Backstage before the Skylark Lounge show — first line of the caption.",
    productType: "REELS",
    postedAt: "2026-07-08T20:00:00.000Z",
    reach: 3400,
    engagement: 410,
    rate: 0.12,
    score: 0.91,
  },
  {
    id: "post-2",
    permalink: "https://instagram.com/p/post-2",
    thumbnailUrl: null,
    caption: "New song teaser — writing process clip.",
    productType: "IMAGE",
    postedAt: "2026-07-02T18:30:00.000Z",
    reach: 1800,
    engagement: 140,
    rate: 0.078,
    score: 0.54,
  },
  {
    id: "post-3",
    permalink: "https://instagram.com/p/post-3",
    thumbnailUrl: null,
    caption: "Live crowd sing-along at Mercury Cafe.",
    productType: "REELS",
    postedAt: "2026-06-24T21:15:00.000Z",
    reach: 2600,
    engagement: 300,
    rate: 0.115,
    score: 0.77,
  },
];

// ---------------------------------------------------------------------------
// Outreach (Booking screen + venue sheet)
// ---------------------------------------------------------------------------
export const PROSPECT_A = {
  id: "11111111-1111-4111-8111-111111111111",
  category: "venues",
  contact_name: "Jamie Rivera",
  contact_role: "Booking Manager",
  org: "The Skylark Lounge",
  email: "jamie@skylarklounge.example",
  city: "Denver",
  source: "manual",
  research_notes: null,
  status: "new",
  cycle: 1,
  followups_sent: 0,
  last_contacted_at: null,
  cooling_until: null,
  needs_action: false,
  gmail_thread_id: null,
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
};

export const PROSPECT_B = {
  id: "22222222-2222-4222-8222-222222222222",
  category: "cafes",
  contact_name: "Alex Chen",
  contact_role: "Events Lead",
  org: "Mercury Cafe",
  email: "alex@mercurycafe.example",
  city: "Denver",
  source: "apollo",
  research_notes: null,
  status: "contacted",
  cycle: 1,
  followups_sent: 1,
  last_contacted_at: "2026-06-28T00:00:00.000Z",
  cooling_until: null,
  needs_action: true,
  gmail_thread_id: null,
  created_at: "2026-05-20T00:00:00.000Z",
  updated_at: "2026-06-28T00:00:00.000Z",
};

export const OUTREACH_SUMMARY_FIXTURE = {
  templates: [],
  needsAction: [
    {
      prospect: PROSPECT_B,
      latestInbound: {
        id: "msg-b1",
        subject: "Re: playing at Mercury",
        snippet: "Hey! We'd love to have you — what Fridays work for you in August?",
        created_at: "2026-07-01T12:00:00.000Z",
      },
    },
  ],
  pipeline: {
    replied_positive: [],
    replied_negative: [],
    in_sequence: [PROSPECT_B],
    new: [PROSPECT_A],
    cooling: [],
  },
};

export const PROSPECT_DETAIL_FIXTURES: Record<string, unknown> = {
  [PROSPECT_A.id]: {
    prospect: PROSPECT_A,
    messages: [
      {
        id: "msg-a1",
        prospect_id: PROSPECT_A.id,
        direction: "outbound",
        kind: "initial",
        subject: "Booking inquiry — Meghan Clarisse Cave",
        body: "Hi Jamie, I'd love to play a show at The Skylark Lounge this fall. Here's a link to my music and recent live footage.",
        sentiment: null,
        created_at: "2026-06-02T10:00:00.000Z",
      },
    ],
  },
  [PROSPECT_B.id]: {
    prospect: PROSPECT_B,
    messages: [
      {
        id: "msg-b1",
        prospect_id: PROSPECT_B.id,
        direction: "inbound",
        kind: "reply",
        subject: "Re: playing at Mercury",
        body: "Hey! We'd love to have you — what Fridays work for you in August?",
        sentiment: "positive",
        created_at: "2026-07-01T12:00:00.000Z",
      },
      {
        id: "msg-b0",
        prospect_id: PROSPECT_B.id,
        direction: "outbound",
        kind: "initial",
        subject: "Booking inquiry — Meghan Clarisse Cave",
        body: "Hi Alex, I play a lot of intimate rooms around Denver and would love to bring a set to Mercury Cafe.",
        sentiment: null,
        created_at: "2026-06-20T09:00:00.000Z",
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// Saved storyboards (library screenshot)
// ---------------------------------------------------------------------------
export const STORYBOARD_LIST_FIXTURE = [
  {
    id: "sb-existing-1",
    idea: "A behind-the-scenes look at tuning up before a show.",
    chosen_title: "The 20 minutes before every show",
    created_at: "2026-07-05T00:00:00.000Z",
    frames: [{ description: "x", onScreenText: "x", assetPrompt: "x" }],
    posting_window: "Thursday 5-7pm — catches the after-work scroll.",
  },
];
