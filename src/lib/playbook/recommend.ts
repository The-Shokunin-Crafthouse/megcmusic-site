/**
 * Deterministic daily post recommendation + 3-day weekly plan for Home's
 * "Your Next Post" (Sprint 10 P4-A). Rule-based, not an LLM call (learning
 * #96 — derive from what's already stored): it must work every morning
 * even if the generation daemon (Meghan's Mac) is asleep.
 *
 * Selection is a djb2 hash of today's America/Denver `YYYY-MM-DD` string
 * (mirrors src/app/api/playbook/tips/route.ts's `daily_insight` algorithm —
 * same-day stability is a hard requirement; the hash helper is duplicated
 * here rather than imported since that route isn't this sprint's file to
 * touch) over a **weighted-ordered candidate list** built from
 * `POST_ARCHETYPES`:
 *
 *   1. Every archetype starts at weight 3.
 *   2. `preferredDays` non-empty and today's America/Denver weekday isn't
 *      in it -> weight -1 (deprioritize, don't exclude).
 *   3. The archetype's `format` maps to the most recently posted post's
 *      `product_type` (REELS -> "reel", FEED -> "photo"|"carousel") ->
 *      weight -1 (steer away from what she just posted).
 *   4. Weight floors at 1 — every archetype stays reachable.
 *   5. The weighted list is the archetype list repeated `weight` times
 *      (id-stable order), and `hash(seed) % list.length` indexes into it —
 *      higher weight means proportionally more of the index space, without
 *      ever excluding a lower-weight archetype outright.
 *
 * Weekly plan: the next 3 distinct posting-window days (from
 * `src/data/playbook.json`'s `postingWindows` prose, encoded below as a
 * static day/window table since the JSON field is free text, not
 * structured), each offset by its own hash seed and forced distinct from
 * the other weekly slots (not necessarily distinct from the daily pick).
 */

import { POST_ARCHETYPES, WEEKLY_SLOT_COUNT, type ArchetypeFormat, type PostArchetype } from "./archetypes";
import type { ProductType } from "./types";

const DENVER_TZ = "America/Denver";

/** djb2 — deterministic, good enough distribution for a small daily index.
 *  Duplicated from src/app/api/playbook/tips/route.ts (not this sprint's
 *  file to edit) — same algorithm, same-day stability contract. */
function hashString(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return hash >>> 0;
}

/** Today's calendar date in America/Denver as `YYYY-MM-DD`. `en-CA` formats
 *  Gregorian dates in that exact order with no extra parsing needed. */
function denverDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DENVER_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Today's weekday (0=Sun...6=Sat) as observed in America/Denver. */
function denverWeekday(date: Date): number {
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: DENVER_TZ,
    weekday: "short",
  }).format(date);
  return WEEKDAY_INDEX[short] ?? 0;
}

/** Anchors "today" (per America/Denver) as a UTC-noon Date so day-of-week
 *  calendar arithmetic below (`addDays`/`getUTCDay`) is unaffected by DST
 *  or the server's own local timezone. */
function denverTodayAsUtcNoon(date: Date): Date {
  const [y, m, d] = denverDateString(date).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weekdayName(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(date);
}

/** Static day/window table encoding src/data/playbook.json's
 *  `postingWindows` prose (America/Denver, confirmed there): Monday is the
 *  IG lead day per the reverse-engineered "Monday best-performing" data
 *  point; weekday evenings ~5-7pm MT are the practical Reels window,
 *  ~6-8pm MT is Facebook's older-local-crowd evening window (Tue/Thu named
 *  explicitly in the sprint brief). Wed/Fri round out the working week with
 *  the same IG-evening window so every weekday carries a slot — this also
 *  reproduces the comp's own sampled Wed/Thu/Fri weekly-card set. Weekends
 *  carry no window: neither the comp nor playbook.json support one. */
const POSTING_WINDOWS: Partial<
  Record<number, { window: string; platform: "instagram" | "facebook" }>
> = {
  1: { window: "5–7pm", platform: "instagram" }, // Monday
  2: { window: "6–8pm", platform: "facebook" }, // Tuesday
  3: { window: "5–7pm", platform: "instagram" }, // Wednesday
  4: { window: "6–8pm", platform: "facebook" }, // Thursday
  5: { window: "5–7pm", platform: "instagram" }, // Friday
};

const SEARCH_HORIZON_DAYS = 21;

function nextPostingWindowDays(
  today: Date,
  count: number,
): { date: Date; window: string }[] {
  const results: { date: Date; window: string }[] = [];
  for (let offset = 1; offset <= SEARCH_HORIZON_DAYS && results.length < count; offset++) {
    const date = addDays(today, offset);
    const entry = POSTING_WINDOWS[date.getUTCDay()];
    if (entry) results.push({ date, window: entry.window });
  }
  return results;
}

/** product_type -> the archetype formats it demotes (spec: REELS -> "reel",
 *  FEED -> "photo"|"carousel"). STORY and an unrecognized/absent type
 *  demote nothing. */
const DEMOTED_FORMATS_BY_PRODUCT_TYPE: Partial<Record<ProductType, ArchetypeFormat[]>> = {
  REELS: ["reel"],
  FEED: ["photo", "carousel"],
};

interface WeightedEntry {
  archetype: PostArchetype;
  weight: number;
}

const BASE_WEIGHT = 3;
const MIN_WEIGHT = 1;

function weighArchetypes(
  todayWeekday: number,
  latestProductType: ProductType | null,
): WeightedEntry[] {
  const demotedFormats = latestProductType
    ? DEMOTED_FORMATS_BY_PRODUCT_TYPE[latestProductType] ?? []
    : [];

  return POST_ARCHETYPES.map((archetype) => {
    let weight = BASE_WEIGHT;
    if (
      archetype.preferredDays.length > 0 &&
      !archetype.preferredDays.includes(todayWeekday)
    ) {
      weight -= 1;
    }
    if (demotedFormats.includes(archetype.format)) {
      weight -= 1;
    }
    return { archetype, weight: Math.max(weight, MIN_WEIGHT) };
  });
}

/** Expands weighted entries into a flat, id-stable-ordered candidate list —
 *  a higher-weight archetype simply occupies more index slots. */
function expandWeighted(entries: WeightedEntry[]): PostArchetype[] {
  const list: PostArchetype[] = [];
  for (const entry of entries) {
    for (let i = 0; i < entry.weight; i++) list.push(entry.archetype);
  }
  return list;
}

/** Picks one archetype from the weighted list via `hash(seed) % length`,
 *  skipping ids already in `exclude` (used to force the weekly slots
 *  distinct from each other) by walking forward deterministically. */
function pickArchetype(
  weightedList: PostArchetype[],
  seed: string,
  exclude: ReadonlySet<string> = new Set(),
): PostArchetype {
  const start = hashString(seed) % weightedList.length;
  for (let i = 0; i < weightedList.length; i++) {
    const candidate = weightedList[(start + i) % weightedList.length];
    if (!exclude.has(candidate.id)) return candidate;
  }
  // Unreachable with >= WEEKLY_SLOT_COUNT distinct archetypes in
  // POST_ARCHETYPES, kept as a defensive fallback rather than a throw.
  return weightedList[start];
}

export interface RecommendationWeeklyEntry {
  day: string;
  window: string;
  headline: string;
  seedIdea: string;
}

export interface RecommendationResult {
  headline: string;
  detail: string;
  seedIdea: string;
  whyTags: string[];
  weekly: RecommendationWeeklyEntry[];
}

export interface RecommendationInput {
  /** `product_type` of the single most recently posted `sp_posts` row
   *  (metrics_available true or not — just latest by `posted_at`), or
   *  `null` when there's no post history yet. */
  latestProductType: ProductType | null;
}

/** Builds today's deterministic recommendation + weekly plan.
 *  `now` is injectable for tests; defaults to the real current time. */
export function buildRecommendation(
  input: RecommendationInput,
  now: Date = new Date(),
): RecommendationResult {
  const dateString = denverDateString(now);
  const todayWeekday = denverWeekday(now);
  const todayUtcNoon = denverTodayAsUtcNoon(now);

  const weighted = expandWeighted(weighArchetypes(todayWeekday, input.latestProductType));

  const daily = pickArchetype(weighted, dateString);

  const windowDays = nextPostingWindowDays(todayUtcNoon, WEEKLY_SLOT_COUNT);
  const usedIds = new Set<string>();
  const weekly: RecommendationWeeklyEntry[] = windowDays.map((day, index) => {
    const picked = pickArchetype(weighted, `${dateString}:weekly:${index}`, usedIds);
    usedIds.add(picked.id);
    return {
      day: weekdayName(day.date),
      window: day.window,
      headline: picked.headline,
      seedIdea: picked.seedIdea,
    };
  });

  return {
    headline: daily.headline,
    detail: daily.detail,
    seedIdea: daily.seedIdea,
    whyTags: daily.whyTags,
    weekly,
  };
}
