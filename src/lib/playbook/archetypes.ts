/**
 * Post archetypes — the vocabulary of the Home screen's "Your Next Post"
 * recommender (Sprint 10). Authored by the Planner in Meghan's register;
 * every archetype is grounded in a specific playbook.json v2 rule (the
 * `ruleIds`) and tagged so "Why this works?" can pull matching
 * `why_this_works` tips from the tips library (`whyTags`).
 *
 * The recommender (`recommend.ts`) picks deterministically per calendar
 * day — same recommendation all day, new one tomorrow — and steers away
 * from the format Meghan posted most recently. This is a derived,
 * rule-based recommendation (studio learning #96: derive from what we
 * already store), NOT an LLM call: it needs to work every morning even if
 * her Mac (the generation daemon) is asleep.
 *
 * `headline` renders at --pb-text-xl (the Home screen's one big-type
 * moment) — keep them under ~90 chars. `detail` is the supporting body.
 * `seedIdea` is what "Let's go!" drops into the creation flow's idea field.
 */

export type ArchetypeFormat = "reel" | "carousel" | "photo" | "facebook";

export interface PostArchetype {
  id: string;
  format: ArchetypeFormat;
  /** Big-type recommendation (Open Sans Light 30px). */
  headline: string;
  /** Supporting body under the headline. */
  detail: string;
  /** Seeds the creation flow's idea field verbatim. */
  seedIdea: string;
  /** playbook.json v2 rule ids this derives from. */
  ruleIds: string[];
  /** context_tags to match why_this_works tips against. */
  whyTags: string[];
  /** Days this archetype fits best (0=Sun…6=Sat); empty = any day. */
  preferredDays: number[];
}

export const POST_ARCHETYPES: PostArchetype[] = [
  {
    id: "send-worthy-reel",
    format: "reel",
    headline: "Film the moment a fan would send to one friend.",
    detail:
      "One take, on the phone, of whatever's real today — the half-written verse, the sound of the room, the thing that made you laugh at practice. Shares beat likes four to one, and this is how you earn them.",
    seedIdea:
      "A short Reel of one real moment from today — raw, one take, something a fan would DM to a friend.",
    ruleIds: ["ig-01", "ig-07"],
    whyTags: ["shares", "hook", "reels", "personal-moment"],
    preferredDays: [1, 2, 3, 4, 5],
  },
  {
    id: "save-worthy-carousel",
    format: "carousel",
    headline: "Make the carousel fans will bookmark.",
    detail:
      "Setlist from the last show, the chords to the song people ask about, your gear rundown — real utility, slide by slide. Utility carousels earn three to four times the saves, and saves are top-tier signal right now.",
    seedIdea:
      "A carousel with real utility — setlist, lyric sheet, or gear notes — something fans will save and come back to.",
    ruleIds: ["ig-02"],
    whyTags: ["saves", "carousel"],
    preferredDays: [],
  },
  {
    id: "original-audio-clip",
    format: "reel",
    headline: "Cut the most singable eight seconds of an original.",
    detail:
      "Post it as its own named audio. Every time someone else uses your sound, the algorithm reads your song as culturally relevant — the clip is the ad, the audio page is the funnel.",
    seedIdea:
      "An 8-second clip of the catchiest line from one of my originals, posted as its own audio.",
    ruleIds: ["ig-08"],
    whyTags: ["original-audio", "original-song", "reels"],
    preferredDays: [],
  },
  {
    id: "sofa-process",
    format: "reel",
    headline: "Let them hear the song before it's finished.",
    detail:
      "A voice-memo verse, tuning the Gibson, the lyric you crossed out — process is content, and fans who watch a song get built are the ones who show up when it's released. Shot on the sofa, obviously.",
    seedIdea:
      "A behind-the-scenes look at the song I'm working on right now — unfinished on purpose, from the sofa.",
    ruleIds: ["ig-07", "ig-01"],
    whyTags: ["bts", "personal-moment", "original-song"],
    preferredDays: [0, 6],
  },
  {
    id: "human-photo",
    format: "photo",
    headline: "Post the human moment — three words is enough.",
    detail:
      "Your haircut post out-reached the polished promo two to one. One honest photo, one short line, no production. The account rewards the person over the campaign every time.",
    seedIdea:
      "One honest photo from my actual day with a short, human caption — no promo, no polish.",
    ruleIds: ["ig-07"],
    whyTags: ["personal-moment", "feed-photo", "reach"],
    preferredDays: [],
  },
  {
    id: "answer-a-fan",
    format: "reel",
    headline: "Answer the question a fan actually asked you.",
    detail:
      "Thirty seconds, to camera, answering the thing someone asked in comments or at the merch table. Real questions are pre-validated hooks — at least one person demonstrably wants this post.",
    seedIdea:
      "A 30-second Reel answering a real question a fan asked me recently — to camera, conversational.",
    ruleIds: ["fb-03", "ig-01"],
    whyTags: ["reply", "comments", "reels", "hook"],
    preferredDays: [],
  },
  {
    id: "cover-hook",
    format: "reel",
    headline: "Cover the song everyone knows — start on the line they love.",
    detail:
      "Familiarity stops the scroll; your voice is why they stay. Open mid-chorus on the line everyone can sing, then make it yours. Credit the original in the caption.",
    seedIdea:
      "A cover clip that opens right on the most familiar line of a song everyone knows, in my own style.",
    ruleIds: ["ig-07", "ig-03"],
    whyTags: ["cover-song", "hook", "reach"],
    preferredDays: [],
  },
  {
    id: "facebook-native",
    format: "facebook",
    headline: "Give Facebook its own post today — your ticket-buyers live there.",
    detail:
      "The 35+ Front Range crowd that actually comes to shows scrolls Facebook, not Reels. A native post — show reminder, a question they can answer in one line, the same clean video posted directly — counts double there right now.",
    seedIdea:
      "A native Facebook post for my local crowd — a show reminder or a question they can answer in one line.",
    ruleIds: ["fb-01", "fb-05", "fb-07"],
    whyTags: ["fb", "show-promo", "reply"],
    preferredDays: [2, 4],
  },
];

/** Weekly-plan slots (Home's "Weekly posts" stack): the recommender fills
 *  the next three posting-window days with distinct archetypes. */
export const WEEKLY_SLOT_COUNT = 3;
