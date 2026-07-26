#!/usr/bin/env node
/**
 * playbook-agent.mjs — the local Mac generation daemon for the Megs Playbook
 * PWA (Sprint 10, CONTEXT.md §2/§5). The PWA never calls an LLM directly: a
 * route handler writes a `queued` row to Supabase `generation_jobs`; this
 * daemon polls, claims one row at a time, builds a prompt from
 * `agent/prompts/*.md` + live context, runs `claude -p --output-format
 * stream-json` on Meghan's own Claude Code subscription, streams partial
 * output back into the row, and validates the final JSON against
 * `agent/contracts.mjs` (mirrors src/lib/playbook/generation.ts) before
 * marking the job `done`. See agent/README.md for setup + verification.
 *
 * Usage:
 *   node agent/playbook-agent.mjs            # run forever, polling every POLL_INTERVAL_MS
 *   node agent/playbook-agent.mjs --once      # process at most one job, then exit
 *
 * Exit codes (`--once`): 0 means the queue was read successfully — a job ran,
 * or there was genuinely nothing queued (also 0 when the agent is disabled by
 * flag, which is a deliberate no-op). 1 means the daemon could not do its job
 * at all: missing Supabase config, a service role key Supabase rejects, or a
 * queue read that failed. A failed read is never reported as an empty queue
 * (studio learning #45 — don't let a broken thing look idle).
 *
 * Env (agent/.env, gitignored — see agent/.env.example):
 *   PLAYBOOK_AGENT_ENABLED   "1" to run; anything else (including unset) is
 *                            a clean no-op exit 0 (studio learning #73 —
 *                            positive default-off flag).
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   required when enabled.
 *   CLAUDE_BIN               path to the claude CLI (default "claude").
 *   POLL_INTERVAL_MS         queue poll interval in ms (default 5000).
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { TIP_SURFACES, parseJobOutput } from "./contracts.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = path.join(__dirname, "prompts");
const SHARED_CONTEXT_PATH = path.join(PROMPTS_DIR, "_shared-context.md");
const ENV_PATH = path.join(__dirname, ".env");

const DEFAULT_POLL_INTERVAL_MS = 5000;
const SPAWN_RETRY_BACKOFFS_MS = [5000, 15000];
const STREAM_SYNC_INTERVAL_MS = 2000;
/** Ceiling on the exponential back-off applied after a failed claim, so a
 *  long Supabase outage doesn't get polled every 5s for hours. */
const CLAIM_ERROR_MAX_BACKOFF_MS = 60000;
/** PostgREST's "no (or multiple) rows returned" code — what `.single()`
 *  reports when the claim UPDATE matched nothing. That is the expected
 *  outcome of losing a claim race, not a failure. */
const PGRST_NO_ROWS = "PGRST116";

/** How long to stop claiming after the CLI reports an exhausted allowance,
 *  indexed by how many times this job has already been put back. Escalating,
 *  because if 5 minutes wasn't enough the window is a long one. Without a
 *  pause the daemon just pulls the next queued job straight into the same
 *  refusal — which is what killed a second storyboard job in 6.1s on
 *  2026-07-24. */
const RATE_LIMIT_COOLDOWNS_MS = [5 * 60 * 1000, 15 * 60 * 1000, 30 * 60 * 1000];

/** Requeue attempts before a rate-limited job is finally errored. Bounded so
 *  a genuinely exhausted allowance can't spin a job forever; the count lives
 *  in memory (see `refusalRequeues`), so a daemon restart forgives it. */
const MAX_RATE_LIMIT_REQUEUES = RATE_LIMIT_COOLDOWNS_MS.length;

const PROMPT_FILES = {
  questions: "questions.md",
  storyboard: "storyboard.md",
  make_it_better: "make_it_better.md",
  titles: "titles.md",
  tip_derivation: "tip_derivation.md",
  tip_review: "tip_review.md",
};

// Model and effort are pinned per job kind rather than inherited from the
// CLI's session default — see runClaudeProcess. `medium` handles the short
// fixed-contract kinds fine; `storyboard` emits the largest structure (a
// full frames array) and was observed failing JSON.parse on the first
// attempt at medium, surviving only via the one-shot repair retry, so it
// gets more headroom rather than sitting one bad roll from a dead job.
const CLAUDE_MODEL = "sonnet";
const DEFAULT_EFFORT = "medium";
const EFFORT_BY_KIND = {
  storyboard: "high",
};

let CLAUDE_BIN = "claude";

// ---------------------------------------------------------------------------
// small utilities
// ---------------------------------------------------------------------------

function nowIso() {
  return new Date().toISOString();
}

function log(message) {
  console.log(`[${nowIso()}] ${message}`);
}

/** Both severities below go to **stderr**, which launchd routes to
 *  `agent/logs/agent-error.log` — so that file holds failures only, and
 *  anything in it deserves a look. `agent.log` (stdout) stays the routine
 *  narrative: polling, claims, streaming, done.
 *
 *  ERROR — needs a human. Either the daemon cannot work at all (rejected
 *  credential, unreadable queue) or a job's outcome was lost: if the `done`
 *  or `error` write fails, the row is stuck in `running` forever and the
 *  PWA polling it spins with no result. Greppable: `grep ERROR`. */
function logError(message) {
  console.error(`[${nowIso()}] ERROR ${message}`);
}

/** WARN — a real failure with bounded blast radius, where the system either
 *  self-corrects or the job's own result survives intact: a dropped
 *  streaming partial (the next ~2s sync rewrites it — cosmetic progress
 *  only), or a post-processing tip write (the job already validated and is
 *  `done`; the tip is missing, nothing is stuck). Greppable: `grep WARN`. */
function logWarn(message) {
  console.error(`[${nowIso()}] WARN ${message}`);
}

/** Flattens a Supabase/PostgREST error to a single line — `message` alone
 *  often omits the part that names the actual cause, while `details` on a
 *  network failure carries a multi-line `Caused by:` stack that would break
 *  one-failure-per-line grepping. Newlines are collapsed, parts already
 *  contained in another part are dropped, and the result is capped. */
function describeDbError(error) {
  const parts = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .map((part) => String(part).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const kept = [];
  for (const part of parts) {
    if (kept.some((other) => other.includes(part))) continue;
    for (let i = kept.length - 1; i >= 0; i--) {
      if (part.includes(kept[i])) kept.splice(i, 1);
    }
    kept.push(part);
  }

  const text = kept.join(" — ") || "unknown error";
  return text.length > 400 ? `${text.slice(0, 400)}…` : text;
}

/** True when the failure is Supabase refusing the credential (as opposed to
 *  a network blip or a Supabase outage). These never fix themselves: they
 *  need `agent/.env` edited, so the daemon should die loudly rather than
 *  poll forever against a key that will never work. */
function isCredentialFailure(error) {
  if (error?.status === 401 || error?.status === 403) return true;
  if (error?.code === "42501") return true; // insufficient_privilege
  const text = `${error?.message ?? ""} ${error?.hint ?? ""}`.toLowerCase();
  return (
    text.includes("invalid api key") ||
    text.includes("no api key") ||
    text.includes("jwt") ||
    text.includes("permission denied")
  );
}

/** Back-off after N consecutive claim failures: pollInterval, ×2 each time,
 *  capped at CLAIM_ERROR_MAX_BACKOFF_MS. */
function claimErrorBackoffMs(consecutiveFailures, pollIntervalMs) {
  const factor = 2 ** Math.min(consecutiveFailures - 1, 10);
  return Math.min(pollIntervalMs * factor, CLAIM_ERROR_MAX_BACKOFF_MS);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sleeps up to `ms`, checked in 500ms steps so a shutdown request wakes the
 *  loop promptly instead of waiting out the full poll interval. */
async function sleepInterruptible(ms, isCancelled) {
  const step = 500;
  let waited = 0;
  while (waited < ms) {
    if (isCancelled()) return;
    await sleep(Math.min(step, ms - waited));
    waited += step;
  }
}

function loadEnv() {
  try {
    process.loadEnvFile(ENV_PATH);
  } catch (err) {
    // ENOENT is the expected "no agent/.env present" case (e.g. the mock
    // smoke test) — PLAYBOOK_AGENT_ENABLED simply reads as unset below and
    // the daemon exits cleanly. Anything else is worth a line, but must
    // never crash — an unreadable .env is not more fatal than a missing one.
    if (err && err.code !== "ENOENT") {
      console.error(`[${nowIso()}] Could not read ${ENV_PATH}: ${err.message}`);
    }
  }
}

function readSharedContext() {
  return fs.readFileSync(SHARED_CONTEXT_PATH, "utf8");
}

function readPromptTemplate(kind) {
  const file = PROMPT_FILES[kind];
  if (!file) throw new Error(`No prompt file mapped for job kind "${kind}".`);
  return fs.readFileSync(path.join(PROMPTS_DIR, file), "utf8");
}

/** Replaces every `{{KEY}}` occurrence in `template` with `values[KEY]`. */
function substitute(template, values) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.split(`{{${key}}}`).join(value);
  }
  return out;
}

/** Strips a single leading/trailing ```json ... ``` (or bare ```) fence if
 *  present; otherwise returns the trimmed text unchanged. */
function stripFences(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return match ? match[1].trim() : trimmed;
}

function safeSlice80(text) {
  return (text ?? "").slice(0, 80);
}

/** Best-effort JSON.parse — returns undefined (not throws) on a non-string
 *  or unparseable input, so callers can chain `??` fallbacks. */
function tryParseJson(value) {
  if (typeof value !== "string") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// CLI refusal classification
//
// When the CLI declines to answer at all — allowance exhausted, not logged
// in, no credit — it says so in plain English on the same channel a JSON
// reply would use. Everything downstream then treats that sentence as the
// model getting the format wrong: `JSON.parse failed`, one repair retry
// fired seconds later into the identical refusal, job dead. Observed
// 2026-07-24: `You've hit…` killed two storyboard jobs, the second in 6.1s,
// and the stored error pointed at the prompt and the schema — both correct.
//
// So classify BEFORE validating, and split by whether waiting fixes it.
// ---------------------------------------------------------------------------

/** Quota/rate refusals: transient. The allowance refills on its own — the
 *  2026-07-24 event cleared within the same session with no change. */
const TRANSIENT_REFUSAL_PATTERNS = [
  /you've hit (?:your|the)[^.]{0,40}limit/i,
  /you have hit (?:your|the)[^.]{0,40}limit/i,
  /usage limit reached/i,
  /rate limit(?:ed)?/i,
  /too many requests/i,
  /try again (?:later|in a)/i,
];

/** Auth/billing refusals: permanent. No amount of waiting helps; a human has
 *  to log in or add credit, so these must fail loudly and immediately. */
const PERMANENT_REFUSAL_PATTERNS = [
  /not logged in/i,
  /please run \/login/i,
  /invalid api key/i,
  /authentication (?:failed|error)/i,
  /credit balance is too low/i,
];

/** Longest reply still considered "a refusal sentence" rather than content.
 *  Real job output is a JSON object several hundred characters minimum. */
const REFUSAL_MAX_LENGTH = 600;

/** Returns `{ kind: "transient"|"permanent", message }` when the CLI refused
 *  outright, else `null`. Deliberately conservative: anything that parses as
 *  JSON, or that opens like JSON, or that is long enough to be real output,
 *  is never a refusal — a false positive here would requeue or kill a job
 *  whose reply was merely malformed, which is what the repair retry is for. */
function detectCliRefusal(text) {
  const trimmed = (text ?? "").trim();
  if (!trimmed || trimmed.length > REFUSAL_MAX_LENGTH) return null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return null;
  if (tryParseJson(trimmed) !== undefined) return null;

  const message = trimmed.replace(/\s+/g, " ").slice(0, 200);
  for (const pattern of PERMANENT_REFUSAL_PATTERNS) {
    if (pattern.test(trimmed)) return { kind: "permanent", message };
  }
  for (const pattern of TRANSIENT_REFUSAL_PATTERNS) {
    if (pattern.test(trimmed)) return { kind: "transient", message };
  }
  return null;
}

// ---------------------------------------------------------------------------
// context fetchers — the daemon-side data the prompts need beyond `input`
// ---------------------------------------------------------------------------

/** {{STATS_CONTEXT}}: top 5 + bottom 5 of the last 50 synced posts by
 *  engagement ratio (total_interactions / reach). */
async function fetchStatsContext(db) {
  const { data, error } = await db
    .from("sp_posts")
    .select("caption, product_type, reach, total_interactions")
    .eq("metrics_available", true)
    .order("posted_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`fetchStatsContext: ${error.message}`);

  const rows = (data ?? []).map((row) => {
    const reach = row.reach ?? 0;
    const totalInteractions = row.total_interactions ?? 0;
    const ratio = reach > 0 ? totalInteractions / reach : 0;
    return {
      caption: safeSlice80(row.caption),
      productType: row.product_type,
      reach,
      totalInteractions,
      ratio: Number(ratio.toFixed(4)),
    };
  });

  const sorted = [...rows].sort((a, b) => b.ratio - a.ratio);
  return {
    top: sorted.slice(0, 5),
    bottom: sorted.slice(-5).reverse(),
  };
}

/** {{CHOSEN_TITLES}}: the closing quarter of the learning loop. Every saved
 *  storyboard records both the options that were offered and the one Meghan
 *  actually picked, so the pair is a preference signal that costs nothing to
 *  collect — it was being written and never read. What makes it worth more
 *  than a list of good titles is the contrast: `passedOver` are titles the
 *  model itself judged strong enough to offer and she declined, which is the
 *  part a prompt can't infer from her published captions.
 *
 *  Empty until she saves storyboards — a new install has no history, and the
 *  prompts are written to ignore an empty array rather than invent a pattern
 *  from nothing. */
async function fetchChosenTitles(db, limit = 10) {
  const { data, error } = await db
    .from("storyboards")
    .select("idea, title_options, chosen_title, created_at")
    .not("chosen_title", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`fetchChosenTitles: ${error.message}`);

  return (data ?? []).map((row) => {
    const options = Array.isArray(row.title_options) ? row.title_options : [];
    const offered = options
      .map((option) => (typeof option?.title === "string" ? option.title : null))
      .filter(Boolean);
    return {
      idea: safeSlice80(row.idea),
      chose: row.chosen_title,
      passedOver: offered.filter((title) => title !== row.chosen_title),
    };
  });
}

/** {{NEAREST_TIPS}}: for each surface, the 5 most recent active tips. */
async function fetchNearestTips(db) {
  const bySurface = {};
  for (const surface of TIP_SURFACES) {
    const { data, error } = await db
      .from("tips")
      .select("id, surface, body")
      .eq("active", true)
      .eq("surface", surface)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(`fetchNearestTips(${surface}): ${error.message}`);
    bySurface[surface] = data ?? [];
  }
  return bySurface;
}

/** {{ACTIVE_TIPS}}: every active tip. Paginated to exhaustion (learning #84
 *  — an unbounded `.select()` silently caps at 1000 rows). */
async function fetchActiveTips(db) {
  const PAGE_SIZE = 1000;
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("tips")
      .select("id, surface, body, context_tags")
      .eq("active", true)
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`fetchActiveTips: ${error.message}`);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

/** {{RULE_CHANGES}}: diff of input.rules against input.previousRules by rule
 *  id, comparing action/rule/insight text. [] when previousRules is null. */
function computeRuleChanges(previousRules, rules) {
  if (!previousRules) return [];

  const prevMap = new Map((previousRules ?? []).map((r) => [r.id, r]));
  const currMap = new Map((rules ?? []).map((r) => [r.id, r]));
  const changes = [];

  for (const [id, rule] of currMap) {
    if (!prevMap.has(id)) {
      changes.push({ ruleId: id, changeType: "added", before: null, after: rule });
    }
  }
  for (const [id, rule] of prevMap) {
    if (!currMap.has(id)) {
      changes.push({ ruleId: id, changeType: "removed", before: rule, after: null });
    }
  }
  for (const [id, currRule] of currMap) {
    const prevRule = prevMap.get(id);
    if (!prevRule) continue;
    const changed =
      prevRule.action !== currRule.action ||
      prevRule.rule !== currRule.rule ||
      prevRule.insight !== currRule.insight;
    if (changed) {
      changes.push({ ruleId: id, changeType: "changed", before: prevRule, after: currRule });
    }
  }
  return changes;
}

async function buildContext(db, kind, input) {
  switch (kind) {
    case "questions":
    case "make_it_better":
      return { statsContext: await fetchStatsContext(db) };
    // The two kinds that emit `titleOptions` also get her past picks. Fetched
    // in parallel because both are independent reads and `storyboard` is
    // already the slowest job kind.
    case "storyboard": {
      const [statsContext, chosenTitles] = await Promise.all([
        fetchStatsContext(db),
        fetchChosenTitles(db),
      ]);
      return { statsContext, chosenTitles };
    }
    case "titles":
      return { chosenTitles: await fetchChosenTitles(db) };
    case "tip_derivation":
      return { nearestTips: await fetchNearestTips(db) };
    case "tip_review":
      return {
        activeTips: await fetchActiveTips(db),
        ruleChanges: computeRuleChanges(input.previousRules ?? null, input.rules ?? []),
      };
    default:
      return {};
  }
}

// ---------------------------------------------------------------------------
// prompt assembly
// ---------------------------------------------------------------------------

function buildPrompt(kind, input, context) {
  const shared = readSharedContext();
  const template = readPromptTemplate(kind);
  let body;

  switch (kind) {
    case "questions":
      body = substitute(template, {
        IDEA: input.idea ?? "",
        STATS_CONTEXT: JSON.stringify(context.statsContext ?? {}),
      });
      break;
    case "storyboard": {
      // Per-frame regeneration (generation.ts storyboard input): when
      // regenerateFrameIndex + existingFrames are present, the note tells
      // Claude to rewrite only that frame; otherwise the placeholder
      // resolves to empty and the prompt reads as a fresh storyboard.
      const regenerateNote =
        typeof input.regenerateFrameIndex === "number" &&
        Array.isArray(input.existingFrames)
          ? `REGENERATE: Keep every frame below exactly as given EXCEPT frame ${input.regenerateFrameIndex} (0-indexed) — rewrite only that frame, keeping the arc intact. Existing frames: ${JSON.stringify(input.existingFrames)}`
          : "";
      body = substitute(template, {
        IDEA: input.idea ?? "",
        ANSWERS: JSON.stringify(input.answers ?? {}),
        STATS_CONTEXT: JSON.stringify(context.statsContext ?? {}),
        CHOSEN_TITLES: JSON.stringify(context.chosenTitles ?? []),
        REGENERATE_NOTE: regenerateNote,
      });
      break;
    }
    case "make_it_better":
      body = substitute(template, {
        IDEA: input.idea ?? "",
        STATS_CONTEXT: JSON.stringify(context.statsContext ?? {}),
      });
      break;
    case "titles": {
      // input.frames / input.previousTitles come straight from the job's
      // `input` jsonb. The route-side input schema (generation.ts) is still
      // evolving under a concurrent sprint step — as of this writing it
      // carries `context` (a free-form string, possibly the frames
      // serialized as JSON) rather than a dedicated `frames` field, plus
      // `previousTitles`. Accept either shape: prefer an explicit
      // `input.frames`, else try to parse `input.context` as JSON, else
      // fall back to the raw context string, else empty.
      const framesValue = input.frames ?? tryParseJson(input.context) ?? input.context ?? [];
      body = substitute(template, {
        IDEA: input.idea ?? "",
        FRAMES: typeof framesValue === "string" ? framesValue : JSON.stringify(framesValue),
        PREVIOUS_TITLES: JSON.stringify(input.previousTitles ?? []),
        CHOSEN_TITLES: JSON.stringify(context.chosenTitles ?? []),
      });
      break;
    }
    case "tip_derivation":
      body = substitute(template, {
        POST: JSON.stringify(input.post ?? {}),
        NEAREST_TIPS: JSON.stringify(context.nearestTips ?? {}),
      });
      break;
    case "tip_review":
      body = substitute(template, {
        RULE_CHANGES: JSON.stringify(context.ruleChanges ?? []),
        ACTIVE_TIPS: JSON.stringify(context.activeTips ?? []),
      });
      break;
    default:
      throw new Error(`Unknown job kind "${kind}".`);
  }

  return `${shared}\n\n${body}`;
}

// ---------------------------------------------------------------------------
// claude -p process management
// ---------------------------------------------------------------------------

/** Spawns `claude -p --output-format stream-json --verbose`, feeds `prompt`
 *  via stdin, parses each stream-json line, accumulates assistant text, and
 *  throttle-syncs a `{partial}` output to the job row every ~2s. Resolves
 *  `{ spawnFailed: true, error }` for ENOENT or a nonzero exit before any
 *  output was ever seen; otherwise `{ spawnFailed: false, accumulatedText,
 *  finalResultText, code, stderr }`. */
function runClaudeProcess(db, job, prompt) {
  return new Promise((resolve) => {
    let child;
    try {
      // Pinned, not inherited: `claude -p` otherwise resolves to whatever
      // the CLI's session default is (it resolved to claude-opus-5[1m]
      // here), so Meghan's own `/model` or `/effort` choices in interactive
      // Claude would silently retune the app — and Opus burns her shared Pro
      // allowance far faster than these short JSON jobs need.
      const effort = EFFORT_BY_KIND[job.kind] ?? DEFAULT_EFFORT;
      child = spawn(
        CLAUDE_BIN,
        // `--include-partial-messages` is what makes the streaming below
        // real. Without it `stream-json` frames only *complete* messages:
        // measured, init at 0.54s, then silence, then the entire reply as one
        // `assistant` event at 9.52s — so the progress accumulator stayed
        // empty for 88% of every run and the ~2s sync had nothing to write.
        // prettier-ignore
        ["-p", "--model", CLAUDE_MODEL, "--effort", effort, "--output-format", "stream-json", "--include-partial-messages", "--verbose"],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    } catch (err) {
      resolve({ spawnFailed: true, error: err.message });
      return;
    }

    let stdoutBuf = "";
    let stderrBuf = "";
    // Two accumulators, deliberately separate. `deltaText` is the progressive
    // one, fed by `stream_event` deltas; `assistantText` is the authoritative
    // one, fed by complete `assistant` events. With partial messages enabled
    // BOTH arrive for the same content — the deltas during, the whole message
    // at the end — so appending to a single buffer would double every reply.
    // Progress reads the deltas; the job's result reads the complete message.
    let deltaText = "";
    let assistantText = "";
    let finalResultText = null;
    let sawAnyOutput = false;
    let loggedStreaming = false;
    let lastSyncedText = null;
    let settled = false;

    /** What to show as in-progress output: the deltas while they're the only
     *  thing available, the complete message once it lands. */
    const progressText = () => deltaText || assistantText;

    const syncPartial = async () => {
      const accumulatedText = progressText();
      if (accumulatedText === lastSyncedText || accumulatedText === "") return;
      lastSyncedText = accumulatedText;
      if (!loggedStreaming) {
        loggedStreaming = true;
        log(`job ${job.id} streaming`);
      }
      const { error } = await db
        .from("generation_jobs")
        .update({
          status: "streaming",
          output: { partial: accumulatedText },
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      if (error) {
        logWarn(`job ${job.id} failed to persist streaming partial: ${describeDbError(error)}`);
      }
    };

    const interval = setInterval(() => {
      syncPartial().catch((err) => logWarn(`job ${job.id} streaming sync error: ${err.message}`));
    }, STREAM_SYNC_INTERVAL_MS);

    child.stdout.on("data", (chunk) => {
      sawAnyOutput = true;
      stdoutBuf += chunk.toString("utf8");
      const lines = stdoutBuf.split("\n");
      stdoutBuf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let event;
        try {
          event = JSON.parse(trimmed);
        } catch {
          continue; // non-JSON line — ignore rather than fail the job
        }
        if (event.type === "stream_event") {
          // Progressive text, one delta at a time (`--include-partial-messages`).
          // Anything that isn't a text delta — thinking, tool blocks, block
          // start/stop — is not part of the reply and is skipped.
          const inner = event.event;
          if (
            inner?.type === "content_block_delta" &&
            inner.delta?.type === "text_delta" &&
            typeof inner.delta.text === "string"
          ) {
            deltaText += inner.delta.text;
          }
        } else if (event.type === "assistant" && Array.isArray(event.message?.content)) {
          for (const block of event.message.content) {
            if (block?.type === "text" && typeof block.text === "string") {
              assistantText += block.text;
            }
          }
        } else if (event.type === "result") {
          if (event.subtype === "success" && typeof event.result === "string") {
            finalResultText = event.result;
          }
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrBuf += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      resolve({ spawnFailed: true, error: err.message });
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearInterval(interval);
      if (code !== 0 && !sawAnyOutput) {
        resolve({
          spawnFailed: true,
          error: `claude exited with code ${code} before producing any output.${
            stderrBuf ? ` stderr: ${stderrBuf.slice(0, 500)}` : ""
          }`,
        });
        return;
      }
      // `accumulatedText` keeps its old meaning for callers: the best
      // available full reply. Prefer the complete assistant message; fall
      // back to the concatenated deltas if the process died before it landed.
      resolve({
        spawnFailed: false,
        accumulatedText: assistantText || deltaText,
        finalResultText,
        code,
        stderr: stderrBuf,
      });
    });

    child.stdin.write(prompt, "utf8");
    child.stdin.end();
  });
}

/** Wraps runClaudeProcess with the spawn-failure retry policy: 2 retries
 *  with backoff (5s, 15s), then errors the job. Returns
 *  `{ ok: false, persisted }` when the job has already been errored —
 *  `persisted` says whether that error actually reached the row — or
 *  `{ ok: true, ...result }`. */
async function spawnClaudeWithRetries(db, job, prompt) {
  let lastError = "unknown spawn error";
  for (let attempt = 0; attempt <= SPAWN_RETRY_BACKOFFS_MS.length; attempt++) {
    const result = await runClaudeProcess(db, job, prompt);
    if (!result.spawnFailed) {
      return { ok: true, ...result };
    }
    lastError = result.error;
    log(`job ${job.id} spawn failed (attempt ${attempt + 1}): ${lastError}`);
    if (attempt < SPAWN_RETRY_BACKOFFS_MS.length) {
      await sleep(SPAWN_RETRY_BACKOFFS_MS[attempt]);
    }
  }
  const persisted = await setError(db, job.id, `claude spawn failed after retries: ${lastError}`);
  return { ok: false, persisted };
}

function extractFinalText(result) {
  const text = result.finalResultText ?? result.accumulatedText ?? "";
  return stripFences(text);
}

function validateOutput(kind, text) {
  let json;
  try {
    json = JSON.parse(text);
  } catch (err) {
    return { success: false, error: `JSON.parse failed: ${err.message}` };
  }
  return parseJobOutput(kind, json);
}

// ---------------------------------------------------------------------------
// job row updates
// ---------------------------------------------------------------------------

/** Returns whether the row actually reached its terminal state. Callers use
 *  it to avoid claiming an outcome the database never received. */
async function setError(db, jobId, message) {
  log(`job ${jobId} error: ${message}`);
  const { error } = await db
    .from("generation_jobs")
    .update({ status: "error", error: message, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  // The row keeps whatever status it had — `running` — so the PWA polling it
  // waits on a job that will never finish, and the reason above exists only
  // in this log. Both facts have to be greppable.
  if (error) {
    logError(
      `job ${jobId} failed to persist error status — row is stuck in 'running' and the failure ` +
        `reason was not saved: ${describeDbError(error)}`,
    );
    return false;
  }
  return true;
}

/** Requeue counts per job id, for rate-limit refusals only. In memory on
 *  purpose: `generation_jobs` has no attempts column, and a restart
 *  forgiving the count is the right default — the operator restarting the
 *  daemon is usually the operator who just fixed the reason. */
const refusalRequeues = new Map();

/** Set by a transient refusal; the poll loop won't claim before it. */
let claimPausedUntil = 0;

/** A quota refusal is not the job's fault, so don't burn it. Put the row back
 *  to `queued` and stop claiming for a while. Returns whether the row was
 *  written — same contract as setError/finalizeSuccess: `false` means the row
 *  is stranded in `running` and the caller must not report success. */
async function requeueAfterRateLimit(db, job, message, attempt) {
  const cooldownMs = RATE_LIMIT_COOLDOWNS_MS[Math.min(attempt - 1, RATE_LIMIT_COOLDOWNS_MS.length - 1)];
  claimPausedUntil = Date.now() + cooldownMs;

  const { error } = await db
    .from("generation_jobs")
    .update({ status: "queued", error: null, updated_at: new Date().toISOString() })
    .eq("id", job.id);
  if (error) {
    logError(
      `job ${job.id} hit a usage limit and could not be requeued — row is stuck in 'running': ` +
        `${describeDbError(error)}. Original refusal: ${message}`,
    );
    return false;
  }

  logWarn(
    `job ${job.id} requeued after a usage limit (attempt ${attempt}/${MAX_RATE_LIMIT_REQUEUES}); ` +
      `pausing claims for ${Math.round(cooldownMs / 60000)}min. CLI said: ${message}`,
  );
  return true;
}

/** Routes a detected refusal. Permanent ones die immediately with the real
 *  reason; transient ones are requeued until the bound is reached, then
 *  errored with a message that still names the cause rather than pretending
 *  the model emitted bad JSON. */
async function handleRefusal(db, job, refusal) {
  if (refusal.kind === "permanent") {
    refusalRequeues.delete(job.id);
    logError(
      `job ${job.id}: the claude CLI refused and waiting will not fix it — "${refusal.message}". ` +
        `Check that the CLI is logged in as the user running this agent ` +
        `(\`claude -p "say hi"\` in a terminal) before re-queuing.`,
    );
    return await setError(db, job.id, `claude CLI unavailable: ${refusal.message}`);
  }

  const attempt = (refusalRequeues.get(job.id) ?? 0) + 1;
  refusalRequeues.set(job.id, attempt);

  if (attempt <= MAX_RATE_LIMIT_REQUEUES) {
    return await requeueAfterRateLimit(db, job, refusal.message, attempt);
  }

  refusalRequeues.delete(job.id);
  return await setError(
    db,
    job.id,
    `claude usage limit not cleared after ${MAX_RATE_LIMIT_REQUEUES} requeues: ${refusal.message}`,
  );
}

/** Returns whether the row actually reached `done`. Post-processing is
 *  best-effort and deliberately does not affect that answer — but it is
 *  skipped entirely when the `done` write failed: inserting tips against a
 *  row still showing `running` invites a double-insert if the job is later
 *  re-queued by hand (`tips` has no dedupe). */
async function finalizeSuccess(db, job, data) {
  const { error } = await db
    .from("generation_jobs")
    .update({ status: "done", output: data, error: null, updated_at: new Date().toISOString() })
    .eq("id", job.id);
  // Same stuck-row problem, and worse: the generation succeeded and its
  // validated output is discarded, so the work is paid for and lost.
  if (error) {
    logError(
      `job ${job.id} failed to persist done status — row is stuck in 'running' and the validated ` +
        `output was lost: ${describeDbError(error)}`,
    );
    return false;
  }
  // Terminal and happy — this job will never be requeued again, so stop
  // tracking it (the map would otherwise grow for the daemon's lifetime).
  refusalRequeues.delete(job.id);
  await runPostProcessing(db, job, data);
  return true;
}

/** tip_derivation inserts new tips; tip_review deactivates (never deletes).
 *  Best-effort: a post-processing failure is logged, not fatal — the job
 *  itself already validated and is `done`. */
async function runPostProcessing(db, job, data) {
  try {
    if (job.kind === "tip_derivation") {
      const postId = job.input?.post?.id ?? null;
      for (const tip of data.tips ?? []) {
        const { error } = await db.from("tips").insert({
          surface: tip.surface,
          body: tip.body,
          context_tags: tip.contextTags ?? [],
          source: "post_derived",
          derived_from_media_id: postId,
        });
        if (error) logWarn(`job ${job.id} tip insert failed: ${describeDbError(error)}`);
      }
    } else if (job.kind === "tip_review") {
      for (const item of data.deactivate ?? []) {
        const { error } = await db.from("tips").update({ active: false }).eq("id", item.id);
        if (error) {
          logWarn(`job ${job.id} tip deactivate failed for ${item.id}: ${describeDbError(error)}`);
        }
      }
    }
  } catch (err) {
    logWarn(`job ${job.id} post-processing error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// claim + process one job
// ---------------------------------------------------------------------------

/** Selects the oldest queued job, then claims it with a double-`.eq` update
 *  (`status='running' where id=<id> and status='queued'`) as the atomicity
 *  guard — if another process (or a race within this one) already claimed
 *  it, the update matches zero rows and `.single()` reports PGRST116, which
 *  this treats as "someone else got it" rather than a fatal error.
 *
 *  Returns `null` **only** for the two genuine idle cases: the queue really
 *  is empty, or the one candidate was claimed by someone else. Every other
 *  failure throws — a caller must never be able to read a broken credential
 *  or an unreachable database as "nothing to do" (studio learning #45). */
async function claimNextJob(db) {
  const { data: candidates, error: selectError } = await db
    .from("generation_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (selectError) throw new Error(`select queued jobs: ${describeDbError(selectError)}`);
  if (!candidates || candidates.length === 0) return null;

  const id = candidates[0].id;
  const { data: claimed, error: claimError } = await db
    .from("generation_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select()
    .single();
  if (claimError) {
    // Zero rows matched: another worker (or an earlier pass of this one)
    // already moved it out of `queued`. Idle, not broken — try again next
    // poll. Anything else is a real failure and must surface.
    if (claimError.code === PGRST_NO_ROWS) return null;
    throw new Error(`claim job ${id}: ${describeDbError(claimError)}`);
  }

  return claimed;
}

/** Startup check that the configured Supabase credential can actually read
 *  `generation_jobs`. Without this, an unusable key first surfaces on the
 *  poll loop — where it used to be indistinguishable from an empty queue.
 *
 *  A rejected credential exits 1: it cannot recover without an `agent/.env`
 *  edit, so crash-looping loudly under launchd's `KeepAlive` is the honest
 *  signal. Anything else (network, Supabase down) only warns — the poll
 *  loop's own retry/back-off handles a transient outage. */
async function preflightSupabase(db) {
  const { error } = await db.from("generation_jobs").select("id").limit(1);
  if (!error) {
    log("preflight ok — Supabase reachable and generation_jobs readable.");
    return;
  }

  const detail = describeDbError(error);
  if (isCredentialFailure(error)) {
    logError(
      `preflight: Supabase rejected the service role key — ${detail}. Check SUPABASE_URL / ` +
        `SUPABASE_SERVICE_ROLE_KEY in agent/.env (and that the generation_jobs migration has been ` +
        `applied). Exiting 1 — this cannot be retried into working.`,
    );
    process.exit(1);
  }
  logError(
    `preflight: could not read generation_jobs — ${detail}. Treating as transient and continuing ` +
      `into the poll loop; claim failures will be logged here.`,
  );
}

/** Returns whether the job reached a terminal state in the database (`done`
 *  or `error`). `false` means the row is stranded in `running` — the work
 *  happened but nothing recorded it, so the caller must not report success.
 *  A job that legitimately fails and records `error` returns `true`: that is
 *  a completed outcome, just not a happy one. */
async function processJob(db, job) {
  const startedAt = Date.now();
  log(`job ${job.id} claimed kind=${job.kind}`);
  const input = job.input ?? {};

  let context;
  try {
    context = await buildContext(db, job.kind, input);
  } catch (err) {
    return await setError(db, job.id, `Context build failed: ${err.message}`);
  }

  let prompt;
  try {
    prompt = buildPrompt(job.kind, input, context);
  } catch (err) {
    return await setError(db, job.id, `Prompt build failed: ${err.message}`);
  }

  const spawnRes = await spawnClaudeWithRetries(db, job, prompt);
  if (!spawnRes.ok) return spawnRes.persisted; // already errored inside

  const text1 = extractFinalText(spawnRes);
  // Before validating: did the CLI answer at all? A refusal is prose, so it
  // fails JSON.parse exactly like a malformed reply would — but the repair
  // retry that exists for malformed replies cannot fix a quota, and firing
  // it spends another request against the limit that just refused.
  const refusal1 = detectCliRefusal(text1);
  if (refusal1) return await handleRefusal(db, job, refusal1);

  const parsed1 = validateOutput(job.kind, text1);
  if (parsed1.success) {
    const persisted = await finalizeSuccess(db, job, parsed1.data);
    // Only claim "done" when the database agrees. On a failed write the
    // ERROR line from finalizeSuccess is the whole story.
    if (persisted) log(`job ${job.id} done in ${Date.now() - startedAt}ms`);
    return persisted;
  }
  log(`job ${job.id} validation failed (attempt 1): ${parsed1.error}`);

  const repairPrompt = `${prompt}\n\n---\nYour previous reply failed validation: ${parsed1.error}. Return ONLY the corrected JSON object.`;
  const spawnRes2 = await spawnClaudeWithRetries(db, job, repairPrompt);
  if (!spawnRes2.ok) return spawnRes2.persisted;

  const text2 = extractFinalText(spawnRes2);
  // The limit can equally be reached *during* a legitimate repair — first
  // reply genuinely malformed, retry refused. Same handling: the job is
  // recoverable and shouldn't be recorded as a contract failure.
  const refusal2 = detectCliRefusal(text2);
  if (refusal2) return await handleRefusal(db, job, refusal2);

  const parsed2 = validateOutput(job.kind, text2);
  if (parsed2.success) {
    const persisted = await finalizeSuccess(db, job, parsed2.data);
    if (persisted) log(`job ${job.id} done (after repair) in ${Date.now() - startedAt}ms`);
    return persisted;
  }
  log(`job ${job.id} validation failed (attempt 2, after repair): ${parsed2.error}`);
  const persisted = await setError(db, job.id, `Validation failed after repair retry: ${parsed2.error}`);
  if (persisted) log(`job ${job.id} error in ${Date.now() - startedAt}ms`);
  return persisted;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  loadEnv();

  if (process.env.PLAYBOOK_AGENT_ENABLED !== "1") {
    log('PLAYBOOK_AGENT_ENABLED is not "1" — agent disabled, exiting cleanly.');
    process.exit(0);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    logError("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — cannot start. Exiting 1.");
    process.exit(1);
  }

  if (process.env.CLAUDE_BIN && process.env.CLAUDE_BIN.trim() !== "") {
    CLAUDE_BIN = process.env.CLAUDE_BIN.trim();
  }

  const once = process.argv.includes("--once");
  const parsedPollInterval = Number(process.env.POLL_INTERVAL_MS);
  const pollIntervalMs =
    Number.isFinite(parsedPollInterval) && parsedPollInterval > 0
      ? parsedPollInterval
      : DEFAULT_POLL_INTERVAL_MS;

  const db = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  log(
    `playbook-agent starting (once=${once}, pollIntervalMs=${pollIntervalMs}, claudeBin=${CLAUDE_BIN})`,
  );

  await preflightSupabase(db);

  let shuttingDown = false;
  const requestShutdown = (signal) => {
    if (!shuttingDown) log(`received ${signal} — finishing any in-flight job, then exiting.`);
    shuttingDown = true;
  };
  process.on("SIGINT", () => requestShutdown("SIGINT"));
  process.on("SIGTERM", () => requestShutdown("SIGTERM"));

  let consecutiveClaimErrors = 0;

  for (;;) {
    if (shuttingDown) {
      log("shutdown complete, exiting.");
      process.exit(0);
    }

    // A usage limit pauses claiming rather than the daemon: without this the
    // loop pulls the next queued job straight into the same refusal, so one
    // limit event burns the whole queue instead of waiting it out.
    const pauseRemainingMs = claimPausedUntil - Date.now();
    if (pauseRemainingMs > 0) {
      if (once) {
        logError(
          `--once: paused for ${Math.round(pauseRemainingMs / 1000)}s after a usage limit, so no ` +
            `job was processed. The job was returned to the queue. Exiting 1.`,
        );
        process.exit(1);
      }
      await sleepInterruptible(Math.min(pauseRemainingMs, pollIntervalMs), () => shuttingDown);
      continue;
    }

    let job = null;
    try {
      job = await claimNextJob(db);
      consecutiveClaimErrors = 0;
    } catch (err) {
      // A failed claim is NOT an empty queue. Reporting it as one made a
      // misconfigured daemon satisfy both of README.md's runtime checks
      // (launchctl label present, log file non-empty) while never being able
      // to work — exactly the false positive learning #45 warns about.
      consecutiveClaimErrors += 1;
      logError(
        `could not claim a job (${consecutiveClaimErrors} consecutive ` +
          `${consecutiveClaimErrors === 1 ? "failure" : "failures"}): ${err.message}`,
      );
      if (once) {
        logError("--once: the queue could not be read, so no job was processed. Exiting 1.");
        process.exit(1);
      }
      // Keep the daemon alive — a Supabase outage should not need a manual
      // restart to recover from — but back off so it isn't hammered.
      const backoff = claimErrorBackoffMs(consecutiveClaimErrors, pollIntervalMs);
      log(`retrying claim in ${backoff}ms.`);
      await sleepInterruptible(backoff, () => shuttingDown);
      continue;
    }

    if (!job) {
      if (once) {
        // Reached only when the query SUCCEEDED and returned no queued row.
        log("queue read ok, no queued jobs — --once exiting 0.");
        process.exit(0);
      }
      await sleepInterruptible(pollIntervalMs, () => shuttingDown);
      continue;
    }

    const persisted = await processJob(db, job);

    if (once) {
      if (!persisted) {
        // The job ran but its outcome never reached the row. Exiting 0 here
        // would be the same lie the empty-queue branch used to tell.
        logError("--once: the job's outcome could not be written back. Exiting 1.");
        process.exit(1);
      }
      log("--once: processed one job, exiting 0.");
      process.exit(0);
    }
  }
}

main().catch((err) => {
  logError(`fatal: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
