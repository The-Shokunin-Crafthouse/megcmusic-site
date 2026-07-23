/**
 * Mirrors src/lib/playbook/generation.ts — OUTPUT contracts only (the daemon
 * never validates job *input*, only what `claude -p` returns). This file and
 * generation.ts must change together: any output-shape edit there needs the
 * matching edit here, and vice versa. Duplicated (not imported) because the
 * daemon is plain-JS ESM (`agent/*.mjs`, Node ≥20) and cannot import from
 * this project's TypeScript sources — see agent/README.md for why.
 *
 * Source of truth for the exact shapes: src/lib/playbook/generation.ts and
 * supabase/migrations/20260713000000_playbook_generation_init.sql.
 */

import { z } from "zod";

export const JOB_KINDS = [
  "questions",
  "storyboard",
  "make_it_better",
  "titles",
  "tip_derivation",
  "tip_review",
];

export const TIP_SURFACES = [
  "daily_insight",
  "why_this_works",
  "stat_insight",
  "booking_insight",
  "checklist",
];

export const TIP_SOURCES = ["seed", "post_derived", "rule_derived"];

const QUESTION_TYPES = [
  "multiselect",
  "single",
  "text_short",
  "text_long",
  "yes_no",
  "scale",
];

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(QUESTION_TYPES),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean(),
});

const titleOptionSchema = z.object({
  title: z.string().min(1),
  rationale: z.string().min(1),
});

const questionsOutputSchema = z.object({
  questions: z.array(questionSchema).min(3).max(6),
});

const frameSchema = z.object({
  description: z.string().min(1),
  onScreenText: z.string().min(1),
  assetPrompt: z.string().min(1),
});

const storyboardOutputSchema = z.object({
  frames: z.array(frameSchema).min(4).max(8),
  titleOptions: z.array(titleOptionSchema).min(3).max(5),
  caption: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(1),
  postingWindow: z.string().min(1),
});

const makeItBetterOutputSchema = z.object({
  sharpened: z.string().min(1),
  why: z.string().min(1),
});

const titlesOutputSchema = z.object({
  titleOptions: z.array(titleOptionSchema).min(3).max(5),
});

// 0 tips is a legitimate outcome (agent/prompts/tip_derivation.md instructs
// Claude to return fewer — or no — tips when the library already covers the
// lesson, rather than padding to a minimum), so there is no `.min()` here.
const tipDerivationOutputSchema = z.object({
  tips: z
    .array(
      z.object({
        surface: z.enum(TIP_SURFACES),
        body: z.string().min(1),
        contextTags: z.array(z.string()),
      }),
    )
    .max(4),
});

const tipReviewOutputSchema = z.object({
  deactivate: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
    }),
  ),
});

const jobOutputSchemas = {
  questions: questionsOutputSchema,
  storyboard: storyboardOutputSchema,
  make_it_better: makeItBetterOutputSchema,
  titles: titlesOutputSchema,
  tip_derivation: tipDerivationOutputSchema,
  tip_review: tipReviewOutputSchema,
};

/**
 * Validates a job's parsed-JSON output against its kind's contract. Mirrors
 * `parseJobOutput` in generation.ts. Returns a result object rather than
 * throwing so the daemon's parse/repair loop can decide retry vs. error.
 */
export function parseJobOutput(kind, json) {
  const schema = jobOutputSchemas[kind];
  if (!schema) {
    return { success: false, error: `Unknown job kind "${kind}".` };
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}
