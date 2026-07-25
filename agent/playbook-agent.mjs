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
 *   node agent/playbook-agent.mjs --once      # process at most one job, then exit 0
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
    case "storyboard":
      return { statsContext: await fetchStatsContext(db) };
    case "tip_derivation":
      return { nearestTips: await fetchNearestTips(db) };
    case "tip_review":
      return {
        activeTips: await fetchActiveTips(db),
        ruleChanges: computeRuleChanges(input.previousRules ?? null, input.rules ?? []),
      };
    case "titles":
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
        // prettier-ignore
        ["-p", "--model", CLAUDE_MODEL, "--effort", effort, "--output-format", "stream-json", "--verbose"],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
    } catch (err) {
      resolve({ spawnFailed: true, error: err.message });
      return;
    }

    let stdoutBuf = "";
    let stderrBuf = "";
    let accumulatedText = "";
    let finalResultText = null;
    let sawAnyOutput = false;
    let loggedStreaming = false;
    let lastSyncedText = null;
    let settled = false;

    const syncPartial = async () => {
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
      if (error) log(`job ${job.id} failed to persist streaming partial: ${error.message}`);
    };

    const interval = setInterval(() => {
      syncPartial().catch((err) => log(`job ${job.id} streaming sync error: ${err.message}`));
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
        if (event.type === "assistant" && Array.isArray(event.message?.content)) {
          for (const block of event.message.content) {
            if (block?.type === "text" && typeof block.text === "string") {
              accumulatedText += block.text;
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
      resolve({ spawnFailed: false, accumulatedText, finalResultText, code, stderr: stderrBuf });
    });

    child.stdin.write(prompt, "utf8");
    child.stdin.end();
  });
}

/** Wraps runClaudeProcess with the spawn-failure retry policy: 2 retries
 *  with backoff (5s, 15s), then errors the job. Returns `{ ok: false }`
 *  when the job has already been errored, or `{ ok: true, ...result }`. */
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
  await setError(db, job.id, `claude spawn failed after retries: ${lastError}`);
  return { ok: false };
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

async function setError(db, jobId, message) {
  log(`job ${jobId} error: ${message}`);
  const { error } = await db
    .from("generation_jobs")
    .update({ status: "error", error: message, updated_at: new Date().toISOString() })
    .eq("id", jobId);
  if (error) log(`job ${jobId} failed to persist error status: ${error.message}`);
}

async function finalizeSuccess(db, job, data) {
  const { error } = await db
    .from("generation_jobs")
    .update({ status: "done", output: data, error: null, updated_at: new Date().toISOString() })
    .eq("id", job.id);
  if (error) log(`job ${job.id} failed to persist done status: ${error.message}`);
  await runPostProcessing(db, job, data);
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
        if (error) log(`job ${job.id} tip insert failed: ${error.message}`);
      }
    } else if (job.kind === "tip_review") {
      for (const item of data.deactivate ?? []) {
        const { error } = await db.from("tips").update({ active: false }).eq("id", item.id);
        if (error) log(`job ${job.id} tip deactivate failed for ${item.id}: ${error.message}`);
      }
    }
  } catch (err) {
    log(`job ${job.id} post-processing error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// claim + process one job
// ---------------------------------------------------------------------------

/** Selects the oldest queued job, then claims it with a double-`.eq` update
 *  (`status='running' where id=<id> and status='queued'`) as the atomicity
 *  guard — if another process (or a race within this one) already claimed
 *  it, the update matches zero rows and `.single()` errors, which this
 *  treats as "someone else got it" rather than a fatal error. */
async function claimNextJob(db) {
  const { data: candidates, error: selectError } = await db
    .from("generation_jobs")
    .select("id")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(1);
  if (selectError) throw new Error(`select queued jobs: ${selectError.message}`);
  if (!candidates || candidates.length === 0) return null;

  const id = candidates[0].id;
  const { data: claimed, error: claimError } = await db
    .from("generation_jobs")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "queued")
    .select()
    .single();
  if (claimError) return null; // lost the race (or a transient error) — try again next poll

  return claimed;
}

async function processJob(db, job) {
  const startedAt = Date.now();
  log(`job ${job.id} claimed kind=${job.kind}`);
  const input = job.input ?? {};

  let context;
  try {
    context = await buildContext(db, job.kind, input);
  } catch (err) {
    await setError(db, job.id, `Context build failed: ${err.message}`);
    return;
  }

  let prompt;
  try {
    prompt = buildPrompt(job.kind, input, context);
  } catch (err) {
    await setError(db, job.id, `Prompt build failed: ${err.message}`);
    return;
  }

  const spawnRes = await spawnClaudeWithRetries(db, job, prompt);
  if (!spawnRes.ok) return; // already errored inside

  const text1 = extractFinalText(spawnRes);
  const parsed1 = validateOutput(job.kind, text1);
  if (parsed1.success) {
    await finalizeSuccess(db, job, parsed1.data);
    log(`job ${job.id} done in ${Date.now() - startedAt}ms`);
    return;
  }
  log(`job ${job.id} validation failed (attempt 1): ${parsed1.error}`);

  const repairPrompt = `${prompt}\n\n---\nYour previous reply failed validation: ${parsed1.error}. Return ONLY the corrected JSON object.`;
  const spawnRes2 = await spawnClaudeWithRetries(db, job, repairPrompt);
  if (!spawnRes2.ok) return;

  const text2 = extractFinalText(spawnRes2);
  const parsed2 = validateOutput(job.kind, text2);
  if (parsed2.success) {
    await finalizeSuccess(db, job, parsed2.data);
    log(`job ${job.id} done (after repair) in ${Date.now() - startedAt}ms`);
    return;
  }
  log(`job ${job.id} validation failed (attempt 2, after repair): ${parsed2.error}`);
  await setError(db, job.id, `Validation failed after repair retry: ${parsed2.error}`);
  log(`job ${job.id} error in ${Date.now() - startedAt}ms`);
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
    log("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set — cannot start. Exiting 1.");
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

  let shuttingDown = false;
  const requestShutdown = (signal) => {
    if (!shuttingDown) log(`received ${signal} — finishing any in-flight job, then exiting.`);
    shuttingDown = true;
  };
  process.on("SIGINT", () => requestShutdown("SIGINT"));
  process.on("SIGTERM", () => requestShutdown("SIGTERM"));

  for (;;) {
    if (shuttingDown) {
      log("shutdown complete, exiting.");
      process.exit(0);
    }

    let job = null;
    try {
      job = await claimNextJob(db);
    } catch (err) {
      log(`error claiming next job: ${err.message}`);
    }

    if (!job) {
      if (once) {
        log("no queued jobs — --once exiting 0.");
        process.exit(0);
      }
      await sleepInterruptible(pollIntervalMs, () => shuttingDown);
      continue;
    }

    await processJob(db, job);

    if (once) {
      log("--once: processed one job, exiting 0.");
      process.exit(0);
    }
  }
}

main().catch((err) => {
  console.error(`[${nowIso()}] fatal: ${err && err.stack ? err.stack : err}`);
  process.exit(1);
});
