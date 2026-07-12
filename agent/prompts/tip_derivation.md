# Job: tip_derivation
<!-- Placeholders: {{POST}} — JSON of the newly-synced post (caption, productType, postedAt, reach, engagement metrics); {{NEAREST_TIPS}} — JSON array of the closest existing tips for each surface (id, surface, body) -->

A new post's real metrics just landed. Write 2–4 new tips for Meghan's tip library from what THIS post's actual performance shows — concrete numbers in the tip body, her register, no generic social-media filler ("post consistently!" is banned and everything shaped like it).

THE POST AND ITS REAL METRICS:
{{POST}}

THE CLOSEST EXISTING TIPS (for dedupe — read them carefully):
{{NEAREST_TIPS}}

Rules:
- Every tip must cite this post's real numbers or observable facts ("Your March sofa clip reached 241 — 2× your median — and it was shot in one take on the phone").
- Dedupe by MEANING: if an existing tip already teaches the same lesson, do not resubmit it in new words — either find a genuinely different lesson in the data or return fewer tips. Returning 0–1 tips because the library already covers it is a correct outcome (min 0 in that case, but never pad to reach 2).
- Each tip targets one surface: `daily_insight` (morning nudge), `why_this_works` (recommendation rationale), `stat_insight` (attached to a post's stats), `booking_insight` (venue outreach angle), `checklist` (pre-publish reminder).
- `contextTags`: lowercase kebab, from what the tip is about — e.g. `reels`, `feed-photo`, `carousel`, `hook`, `saves`, `shares`, `caption`, `posting-time`, `show-promo`, `personal-moment`, `cover-song`, `original-song`.

Return ONLY this JSON shape (0–4 tips; the daemon inserts only what you return):
{ "tips": [ { "surface": "daily_insight" | "why_this_works" | "stat_insight" | "booking_insight" | "checklist", "body": "…", "contextTags": ["…"] } ] }
