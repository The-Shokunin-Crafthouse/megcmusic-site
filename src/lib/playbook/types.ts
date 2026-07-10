/**
 * Shared domain types for the Social Playbook Dashboard.
 *
 * These mirror the Supabase schema in
 * supabase/migrations/20260710000000_social_playbook_init.sql exactly. The DB
 * stores the string-union columns as plain `text`, so the unions here are the
 * single place the allowed values are enforced in the type system — every
 * route and component imports from here rather than re-declaring literals.
 */

export type Platform = "instagram" | "facebook";

export type MediaType = "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";

/** `media_product_type` from the Graph API. STORY is excluded from sync v1
 *  (24h lifespan, thin insights) — the column stays typed for it because a
 *  media item can still surface it before backfill filters it out. */
export type ProductType = "FEED" | "REELS" | "STORY";

export type SyncRunKind = "sync" | "generate" | "backfill";
export type SyncRunStatus = "ok" | "error" | "auth_error";

export type RecommendationStatus = "active" | "used" | "dismissed";

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

export interface StoryboardShot {
  shot: string;
  direction: string;
  duration_s: number;
}

export interface SuggestedTime {
  dow: string;
  local_time: string;
  tz: "America/Denver";
  rationale: string;
}

export interface RecommendationProvenance {
  rule_ids: string[];
  post_ids: string[];
}

export type GeneratedPostType = "reel" | "carousel" | "story" | "photo";

/** A row of the `sp_recommendations` table. */
export interface Recommendation {
  id: string;
  batch_id: string;
  rank: number;
  summary: string;
  post_type: GeneratedPostType;
  script_md: string;
  storyboard: StoryboardShot[];
  suggested_time: SuggestedTime;
  based_on: RecommendationProvenance;
  status: RecommendationStatus;
  model: string;
  generated_at: string;
}

/** A row of the `sp_idea_generations` table. */
export interface IdeaGeneration {
  id: string;
  input: string;
  script_md: string;
  storyboard: StoryboardShot[];
  suggested_time: SuggestedTime;
  model: string;
  created_at: string;
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
  recommendations: Recommendation[];
  topPosts: TopPost[];
  lastSync: string | null;
  lastGenerate: string | null;
  health: DashboardHealth;
}

/** Reach floor below which an engagement rate is noise, not signal. */
export const MIN_REACH_FOR_RATE = 100;

/** `stale` health kicks in once the last ok sync is older than this. */
export const STALE_AFTER_HOURS = 48;
