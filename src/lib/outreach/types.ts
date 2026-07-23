/**
 * Shared domain types for the Booking Outreach Engine.
 *
 * These mirror the Supabase schema in
 * supabase/migrations/20260705000000_outreach_engine_init.sql exactly. The DB
 * stores the string-union columns as plain `text`, so the unions here are the
 * single place the allowed values are enforced in the type system — every
 * route and component imports from here rather than re-declaring literals.
 */

export const CATEGORIES = [
  "bars",
  "corporate",
  "private",
  "venues",
  "agents",
  "cafes",
] as const;
export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export type ProspectStatus =
  | "new"
  | "contacted"
  | "replied_positive"
  | "replied_negative"
  | "opted_out"
  | "cooling";

export type ProspectSource = "apollo" | "apify" | "web" | "manual";

export type TemplateStatus = "pending" | "approved";

/** Global follow-up kinds — no category, no subject; they thread as replies. */
export const FOLLOWUP_KINDS = ["followup_1", "followup_2", "followup_3"] as const;
export type FollowupKind = (typeof FOLLOWUP_KINDS)[number];
export type TemplateKind = "initial" | FollowupKind;

export function isFollowupKind(value: string): value is FollowupKind {
  return (FOLLOWUP_KINDS as readonly string[]).includes(value);
}

export type MessageDirection = "outbound" | "inbound";

export type MessageKind =
  | "initial"
  | "followup_1"
  | "followup_2"
  | "followup_3"
  | "reply";

export type Sentiment = "positive" | "negative" | "neutral";

/** A row of the `prospects` table. */
export interface Prospect {
  id: string;
  category: string;
  contact_name: string | null;
  contact_role: string | null;
  org: string;
  email: string;
  city: string | null;
  source: string;
  research_notes: string | null;
  status: ProspectStatus;
  cycle: number;
  followups_sent: number;
  last_contacted_at: string | null;
  cooling_until: string | null;
  needs_action: boolean;
  gmail_thread_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * A row of the `templates` table. `kind` distinguishes per-category
 * initials from the three global follow-ups: follow-up rows carry
 * `category`/`subject_template`/`signature` as null (no subject — they
 * thread onto the original message — and the sign-off lives in the body).
 */
export interface Template {
  id: string;
  category: string | null;
  kind: TemplateKind;
  label: string;
  audience: string;
  subject_template: string | null;
  body_template: string;
  signature: string | null;
  status: TemplateStatus;
  approved_at: string | null;
  updated_at: string;
}

/** Route-param / list-key for a template: category for initials, kind for follow-ups. */
export function templateKey(t: Pick<Template, "kind" | "category">): string {
  return t.kind === "initial" ? (t.category ?? "") : t.kind;
}

/** A row of the `messages` table. */
export interface Message {
  id: string;
  prospect_id: string;
  direction: MessageDirection;
  kind: MessageKind;
  cycle: number;
  subject: string | null;
  body: string | null;
  gmail_message_id: string | null;
  sentiment: Sentiment | null;
  created_at: string;
}

/**
 * Pipeline buckets returned by GET /api/outreach/summary. `in_sequence` rows
 * carry `cycle` and `followups_sent` so the UI can render "cycle N ·
 * follow-up X/3" without a second query.
 */
export interface PipelineBuckets {
  replied_positive: Prospect[];
  replied_negative: Prospect[];
  in_sequence: Prospect[];
  new: Prospect[];
  cooling: Prospect[];
}

/** A needs-action row plus a snippet of the latest inbound message. */
export interface NeedsActionItem {
  prospect: Prospect;
  latestInbound: {
    id: string;
    subject: string | null;
    snippet: string;
    created_at: string;
  } | null;
}

/** Full response shape of GET /api/outreach/summary. */
export interface OutreachSummary {
  templates: Template[];
  needsAction: NeedsActionItem[];
  pipeline: PipelineBuckets;
}

/** The literal that must survive every template edit before approval. */
export const PERSONAL_TOUCH_TOKEN = "{{PERSONAL_TOUCH}}";
