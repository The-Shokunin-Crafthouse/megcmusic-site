/**
 * Static placeholder documentation shown on the playbook next to each
 * follow-up template, so Meg remembers what each {{PLACEHOLDER}} does.
 * Reference text, not editable content — lives in code, not the DB.
 */

import type { FollowupKind } from "./types";

export const SHARED_PLACEHOLDER_NOTE =
  "{{FIRST_NAME_OR_TEAM}}, {{VENUE_SHORT}} — same semantics as the initial templates.";

export const FOLLOWUP_PLACEHOLDER_NOTES: Record<FollowupKind, string[]> = {
  followup_1: [
    "{{NEW_FACT}} — one true sentence about something new since the last email: a packed night nearby, a new single, a strong show. Filled per-prospect by the automation; must be verifiable.",
    "{{RE_ASK_QUESTION}} — the original ask from the initial email, asked plainly again.",
  ],
  followup_2: [
    '{{ANGLE_LINE}} — one sentence switching the value proposition by category. Examples: bars: "My following shows up and stays. That makes for a good night at the taps." / venues: "Happy to talk a split bill with a local act I can bring." / corporate: "I handle my own sound and setup, so it\'s painless for whoever\'s organizing."',
    '{{SOCIAL_PROOF_LINE}} — optional; used only if real and verifiable (e.g. "Todd and I took Duo of the Year 2025 from the Colorado Country Music Hall of Fame."). When unused, the automation omits the line entirely — the template renderer must tolerate a removed line without leaving a double blank.',
    "{{DIRECT_QUESTION}} — one plain question.",
  ],
  followup_3: [
    "Follow-up 3 has no free-text placeholders beyond name/venue — it sends as written.",
  ],
};
