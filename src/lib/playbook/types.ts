/**
 * Shared domain types for the Social Playbook Dashboard.
 *
 * These mirror the Supabase schema in
 * supabase/migrations/20260710000000_social_playbook_init.sql exactly. The DB
 * stores the string-union columns as plain `text`, so the unions here are the
 * single place the allowed values are enforced in the type system — every
 * route and component imports from here rather than re-declaring literals.
 *
 * The generation-queue row types below (GenerationJob, StoryboardRow, Tip,
 * ChecklistStateRow) mirror
 * supabase/migrations/20260713000000_playbook_generation_init.sql the same
 * way; their kind/status/surface/source unions are owned by
 * src/lib/playbook/generation.ts (the zod contract module) and re-exported
 * here rather than redeclared.
 */

import type {
  Frame,
  JobKind,
  JobStatus,
  TipSource,
  TipSurface,
  TitleOption,
} from "@/lib/playbook/generation";

export type Platform = "instagram" | "facebook";

export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

/** `media_product_type` from the Graph API. STORY is excluded from sync v1
 *  (24h lifespan, thin insights) — the column stays typed for it because a
 *  media item can still surface it before backfill filters it out. */
export type ProductType = "FEED" | "REELS" | "STORY";

export type SyncRunKind = "sync" | "backfill";
export type SyncRunStatus = "ok" | "error" | "auth_error";

/** A row of the `sp_posts` table. */
export interface Post {
  id: string;
  platform: Platform;
  media_type: MediaType;
  product_type: ProductType;
  caption: string | null;
  permalink: string;
  thumbnail_url: string | null;
  posted_at: string;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  total_interactions: number | null;
  metrics_available: boolean;
  metrics_synced_at: string | null;
  created_at: string;
}

/** A row of the `sp_metric_snapshots` table. */
export interface MetricSnapshot {
  id: number;
  post_id: string;
  captured_at: string;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  total_interactions: number | null;
}

/** A row of the `sp_sync_runs` table. */
export interface SyncRun {
  id: number;
  kind: SyncRunKind;
  status: SyncRunStatus;
  detail: string | null;
  started_at: string;
  finished_at: string | null;
}

/** A Top-5 row, precomputed by the summary route's SQL/JS —
 *  rate = (likes+comments+saved+shares) / reach, reach >= 100 floor. */
export interface TopPost {
  id: string;
  permalink: string;
  thumbnailUrl: string | null;
  caption: string | null;
  productType: ProductType;
  postedAt: string;
  reach: number;
  engagement: number;
  rate: number;
}

export type DashboardHealth = "ok" | "stale" | "auth_error";

/** Full response shape of GET /api/playbook/summary. */
export interface PlaybookSummary {
  topPosts: TopPost[];
  lastSync: string | null;
  health: DashboardHealth;
}

/** Reach floor below which an engagement rate is noise, not signal. */
export const MIN_REACH_FOR_RATE = 100;

/** `stale` health kicks in once the last ok sync is older than this. */
export const STALE_AFTER_HOURS = 48;

/** A row of the `generation_jobs` table. `input`/`output` are the raw jsonb —
 *  validate with `parseJobInput`/`parseJobOutput` (generation.ts) before
 *  trusting their shape. */
export interface GenerationJob {
  id: string;
  kind: JobKind;
  status: JobStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

/** A row of the `storyboards` table — a saved, generated storyboard. */
export interface StoryboardRow {
  id: string;
  idea: string;
  answers: Record<string, unknown> | null;
  frames: Frame[];
  title_options: TitleOption[] | null;
  chosen_title: string | null;
  caption: string | null;
  posting_window: string | null;
  created_at: string;
}

/** A row of the `tips` table. */
export interface Tip {
  id: string;
  surface: TipSurface;
  body: string;
  context_tags: string[];
  source: TipSource;
  derived_from_media_id: string | null;
  active: boolean;
  times_shown: number;
  last_shown_at: string | null;
  created_at: string;
}

/** A row of the `checklist_state` table — `day` is a `YYYY-MM-DD` date
 *  string (Postgres `date`, returned by supabase-js as text). */
export interface ChecklistStateRow {
  day: string;
  item_id: string;
  checked: boolean;
  checked_at: string | null;
}
