/**
 * Zod schemas + inferred types for the generation-queue contract (Sprint 10
 * Megs Playbook Redesign, PLAN.md §5). The PWA never calls an LLM directly —
 * it writes a `generation_jobs` row; a local daemon on Meghan's Mac
 * (`agent/playbook-agent.mjs`) runs `claude -p` and writes strict JSON back
 * to `output`. These schemas are the one place both sides (route handlers
 * here, the daemon's prompt/parse loop) validate against, so the contract
 * can't drift between them. The daemon retries once with repair
 * instructions on a parse failure, then errors the job (PLAN.md §5) — that
 * retry loop lives in `agent/`, not here; this module only validates.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Job kinds / status — mirrors the `check` constraints in
// supabase/migrations/20260713000000_playbook_generation_init.sql exactly.
// ---------------------------------------------------------------------------

export const JOB_KINDS = [
  "questions",
  "storyboard",
  "make_it_better",
  "titles",
  "tip_derivation",
  "tip_review",
] as const;
export type JobKind = (typeof JOB_KINDS)[number];

export function isJobKind(value: unknown): value is JobKind {
  return typeof value === "string" && (JOB_KINDS as readonly string[]).includes(value);
}

/** The four kinds the PWA itself may enqueue. `tip_derivation`/`tip_review`
 *  are machine-enqueued only (by the stats sync / playbook.json sync) — a
 *  page-originated request for either is refused (403) in the route. */
export const PAGE_CREATABLE_KINDS = [
  "questions",
  "storyboard",
  "make_it_better",
  "titles",
] as const;
export type PageCreatableKind = (typeof PAGE_CREATABLE_KINDS)[number];

export function isPageCreatableKind(value: unknown): value is PageCreatableKind {
  return (
    typeof value === "string" &&
    (PAGE_CREATABLE_KINDS as readonly string[]).includes(value)
  );
}

export const JOB_STATUSES = [
  "queued",
  "running",
  "streaming",
  "done",
  "error",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// ---------------------------------------------------------------------------
// Question engine schema (PLAN.md §3.6) — shared by the questions job's
// output and the creation-flow question renderer.
// ---------------------------------------------------------------------------

export const QUESTION_TYPES = [
  "multiselect",
  "single",
  "text_short",
  "text_long",
  "yes_no",
  "scale",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(QUESTION_TYPES),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  required: z.boolean(),
});
export type Question = z.infer<typeof questionSchema>;

// ---------------------------------------------------------------------------
// Job INPUT contracts — validated on POST /api/playbook/jobs before a row is
// inserted. Only the four page-creatable kinds have an input schema here;
// tip_derivation/tip_review inputs are constructed server-side by the sync
// routes that enqueue them, not accepted from the page.
// ---------------------------------------------------------------------------

/** Answers are keyed by question id; the value shape varies by question
 *  type (string, string[], number, boolean), so it's validated loosely here
 *  and interpreted by the daemon prompt against the stored questions. */
const answersSchema = z.record(z.string(), z.unknown());

export const jobInputSchemas = {
  questions: z.object({ idea: z.string().min(1) }),
  storyboard: z.object({
    idea: z.string().min(1),
    answers: answersSchema,
    // Per-frame regeneration (P5 spec, Screen 7): the existing frames plus
    // the index to rewrite. The daemon appends a REGENERATE note to the
    // prompt; the response is still a full frames array with only that
    // frame changed. Both optional — absent means a fresh storyboard.
    existingFrames: z.array(z.unknown()).optional(),
    regenerateFrameIndex: z.number().int().min(0).optional(),
  }),
  make_it_better: z.object({ idea: z.string().min(1) }),
  titles: z.object({
    idea: z.string().min(1),
    context: z.string().optional(),
    // Titles already offered — the prompt forbids repeating them (P5 spec,
    // "Fresh titles" action).
    previousTitles: z.array(z.string()).optional(),
  }),
} satisfies Record<PageCreatableKind, z.ZodTypeAny>;

export type QuestionsInput = z.infer<typeof jobInputSchemas.questions>;
export type StoryboardInput = z.infer<typeof jobInputSchemas.storyboard>;
export type MakeItBetterInput = z.infer<typeof jobInputSchemas.make_it_better>;
export type TitlesInput = z.infer<typeof jobInputSchemas.titles>;

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function parseJobInput(
  kind: PageCreatableKind,
  json: unknown,
): ParseResult<z.infer<(typeof jobInputSchemas)[typeof kind]>> {
  const result = jobInputSchemas[kind].safeParse(json);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data };
}

// ---------------------------------------------------------------------------
// Job OUTPUT contracts (PLAN.md §5).
// ---------------------------------------------------------------------------

export const titleOptionSchema = z.object({
  title: z.string().min(1),
  rationale: z.string().min(1),
});
export type TitleOption = z.infer<typeof titleOptionSchema>;

export const questionsOutputSchema = z.object({
  questions: z.array(questionSchema).min(3).max(6),
});
export type QuestionsOutput = z.infer<typeof questionsOutputSchema>;

export const frameSchema = z.object({
  description: z.string().min(1),
  // Deliberately NOT `.min(1)`: a frame with no overlay text is valid
  // content, and `agent/prompts/storyboard.md` tells Claude to return an
  // empty string for exactly that case. Requiring a character contradicted
  // the prompt, so any storyboard with a text-free frame failed validation
  // and burned its one repair retry — whose only way to pass was to invent
  // overlay text for frames that should not have any. `StoryboardResult`
  // already conditionally renders this field, so empty renders correctly.
  // Mirror any change here in `agent/contracts.mjs`.
  onScreenText: z.string(),
  assetPrompt: z.string().min(1),
});
export type Frame = z.infer<typeof frameSchema>;

export const storyboardOutputSchema = z.object({
  frames: z.array(frameSchema).min(4).max(8),
  titleOptions: z.array(titleOptionSchema).min(3).max(5),
  caption: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(1),
  postingWindow: z.string().min(1),
});
export type StoryboardOutput = z.infer<typeof storyboardOutputSchema>;

export const makeItBetterOutputSchema = z.object({
  sharpened: z.string().min(1),
  why: z.string().min(1),
});
export type MakeItBetterOutput = z.infer<typeof makeItBetterOutputSchema>;

export const titlesOutputSchema = z.object({
  titleOptions: z.array(titleOptionSchema).min(3).max(5),
});
export type TitlesOutput = z.infer<typeof titlesOutputSchema>;

export const TIP_SURFACES = [
  "daily_insight",
  "why_this_works",
  "stat_insight",
  "booking_insight",
  "checklist",
] as const;
export type TipSurface = (typeof TIP_SURFACES)[number];

export const TIP_SOURCES = ["seed", "post_derived", "rule_derived"] as const;
export type TipSource = (typeof TIP_SOURCES)[number];

export const tipDerivationOutputSchema = z.object({
  tips: z
    .array(
      z.object({
        surface: z.enum(TIP_SURFACES),
        body: z.string().min(1),
        contextTags: z.array(z.string()),
      }),
    )
    // 0 is a legitimate outcome: the prompt (agent/prompts/tip_derivation.md)
    // instructs Claude to return fewer — or no — tips when the library already
    // covers the lesson, rather than padding to a minimum.
    .max(4),
});
export type TipDerivationOutput = z.infer<typeof tipDerivationOutputSchema>;

/** Matches the P6 prompt contract (`agent/prompts/tip_review.md`): each
 *  retirement carries the one-sentence reason naming the rule change that
 *  killed it, so deactivations stay auditable. Deactivate, never delete. */
export const tipReviewOutputSchema = z.object({
  deactivate: z.array(
    z.object({
      id: z.string(),
      reason: z.string(),
    }),
  ),
});
export type TipReviewOutput = z.infer<typeof tipReviewOutputSchema>;

const jobOutputSchemas = {
  questions: questionsOutputSchema,
  storyboard: storyboardOutputSchema,
  make_it_better: makeItBetterOutputSchema,
  titles: titlesOutputSchema,
  tip_derivation: tipDerivationOutputSchema,
  tip_review: tipReviewOutputSchema,
} satisfies Record<JobKind, z.ZodTypeAny>;

export type JobOutputFor<K extends JobKind> = z.infer<
  (typeof jobOutputSchemas)[K]
>;

/** Validates a job's raw `output` jsonb against its kind's contract. Used by
 *  the mock-mode job insert (fixtures must satisfy their own contract) and
 *  available to the daemon's parse/repair loop. Returns a result rather than
 *  throwing so callers can decide how to react (retry vs. error the job). */
export function parseJobOutput<K extends JobKind>(
  kind: K,
  json: unknown,
): ParseResult<JobOutputFor<K>> {
  const schema = jobOutputSchemas[kind];
  const result = schema.safeParse(json);
  if (!result.success) {
    return { success: false, error: result.error.message };
  }
  return { success: true, data: result.data as JobOutputFor<K> };
}
