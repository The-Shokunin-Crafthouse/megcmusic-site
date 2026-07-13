import type { Page, Route } from "@playwright/test";
import questionsFixture from "@/app/megs-playbook/__fixtures__/questions.json";
import storyboardFixture from "@/app/megs-playbook/__fixtures__/storyboard.json";
import makeItBetterFixture from "@/app/megs-playbook/__fixtures__/make_it_better.json";
import titlesFixture from "@/app/megs-playbook/__fixtures__/titles.json";
import {
  TIP_BODIES,
  RECOMMENDATION_FIXTURE,
  POSTS_FIXTURE,
  OUTREACH_SUMMARY_FIXTURE,
  PROSPECT_DETAIL_FIXTURES,
  STORYBOARD_LIST_FIXTURE,
} from "./data";

/**
 * Network-mock layer for the whole Megs Playbook data surface (P8 test
 * charter). The Supabase migration for generation_jobs/storyboards/tips/
 * checklist_state is NOT applied to the dev DB this suite runs against, so
 * every route the app calls is intercepted here rather than hit for real —
 * including /api/playbook/jobs, which even under MOCK_GENERATION=1 still
 * inserts a DB row server-side.
 */

const JOB_FIXTURES: Record<string, unknown> = {
  questions: questionsFixture,
  storyboard: storyboardFixture,
  make_it_better: makeItBetterFixture,
  titles: titlesFixture,
};

function uuid(): string {
  return crypto.randomUUID();
}

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

/** POST /api/playbook/jobs + GET /api/playbook/jobs/[id] — jobs backed by
 *  the committed generation fixtures, keyed by the `kind` each POST
 *  carries; the GET always answers "done" with the fixture output on the
 *  very first poll (no artificial delay).
 *
 *  The POST response's `status` is deliberately "queued" here, NOT the
 *  "done" that a real MOCK_GENERATION=1 server returns (jobs/route.ts:
 *  `status: mock ? "done" : "queued"`) — see PRODUCT BUG note in
 *  known-bugs.spec.ts. Seeding "done" here reproduces a real race in
 *  useGenerationJob.ts's `useCreateJob` (its optimistic cache-seed writes
 *  `status: result.status` with `output: null`; when that status is
 *  already terminal, IdeaEntry.tsx's questions/make_it_better effects
 *  treat the seed itself as the finished-but-unparseable job and bail out
 *  before the real fetch below ever lands) that would otherwise block
 *  every other test in this suite from ever reaching the questions screen.
 *  "queued" here is the same value a real (non-mock) POST returns, so this
 *  is the more representative default for exercising everything past the
 *  idea screen; known-bugs.spec.ts still proves the "done" case fails. */
export async function mockGenerationJobs(page: Page, opts: { postStatus?: "queued" | "done" } = {}) {
  const postStatus = opts.postStatus ?? "queued";
  const jobs = new Map<string, { kind: string; output: unknown }>();

  await page.route("**/api/playbook/jobs", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const body = route.request().postDataJSON() as { kind: string };
    const id = uuid();
    jobs.set(id, { kind: body.kind, output: JOB_FIXTURES[body.kind] ?? null });
    await json(route, { id, status: postStatus }, 201);
  });

  await page.route("**/api/playbook/jobs/*", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const id = route.request().url().split("/").pop() as string;
    const job = jobs.get(id);
    const now = new Date().toISOString();
    if (!job) {
      await json(route, { error: `No job with id "${id}".` }, 404);
      return;
    }
    await json(route, {
      id,
      kind: job.kind,
      status: "done",
      output: job.output,
      error: null,
      createdAt: now,
      updatedAt: now,
    });
  });
}

/** GET /api/playbook/tips?surface=X — stateful per-surface rotation so
 *  consecutive calls for the same surface return different bodies
 *  (tip-rotation.spec.ts asserts on this directly). */
export async function mockTips(page: Page) {
  const counters = new Map<string, number>();

  await page.route("**/api/playbook/tips*", async (route) => {
    const url = new URL(route.request().url());
    const surface = url.searchParams.get("surface") as keyof typeof TIP_BODIES | null;
    const bodies = surface ? TIP_BODIES[surface] : undefined;
    if (!surface || !bodies) {
      await json(route, { error: `Unknown surface "${surface}".` }, 400);
      return;
    }
    const index = counters.get(surface) ?? 0;
    counters.set(surface, index + 1);
    const body = bodies[index % bodies.length];
    await json(route, { id: `tip-${surface}-${index}`, body, surface });
  });
}

export async function mockRecommendation(page: Page) {
  await page.route("**/api/playbook/recommendation*", async (route) => {
    await json(route, RECOMMENDATION_FIXTURE);
  });
}

/** Forces Home's empty-recommendation state ("Start your own idea",
 *  unseeded) — registered after mockAll so it takes precedence (Playwright
 *  matches the most-recently-registered route first). Used by
 *  exit-behavior.spec.ts, which needs an unseeded creation-flow entry point
 *  so re-entering the flow doesn't re-seed over the persisted draft. */
export async function mockRecommendationEmpty(page: Page) {
  await page.route("**/api/playbook/recommendation*", async (route) => {
    await json(route, { ...RECOMMENDATION_FIXTURE, headline: "", detail: "", seedIdea: "" });
  });
}

export async function mockPosts(page: Page) {
  await page.route("**/api/playbook/posts*", async (route) => {
    await json(route, POSTS_FIXTURE);
  });
}

/** GET/PUT /api/playbook/checklist — stateful per-item map so a PUT persists
 *  across a subsequent GET (e.g. after page.reload()) within the same
 *  test, matching the real day/item_id upsert contract at the UI level. */
export async function mockChecklist(page: Page, initial: Record<string, boolean> = {}) {
  const items: Record<string, boolean> = { ...initial };

  await page.route("**/api/playbook/checklist*", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await json(route, { items: { ...items } });
      return;
    }
    if (method === "PUT") {
      const body = route.request().postDataJSON() as { itemId: string; checked: boolean };
      items[body.itemId] = body.checked;
      await json(route, { item_id: body.itemId, checked: body.checked });
      return;
    }
    await route.continue();
  });

  return items;
}

export async function mockOutreach(page: Page) {
  await page.route("**/api/outreach/summary*", async (route) => {
    await json(route, OUTREACH_SUMMARY_FIXTURE);
  });

  await page.route("**/api/outreach/prospects/*", async (route) => {
    const method = route.request().method();
    const id = route.request().url().split("/").pop() as string;
    if (method === "GET") {
      const detail = PROSPECT_DETAIL_FIXTURES[id];
      if (!detail) {
        await json(route, { error: `No prospect with id "${id}".` }, 404);
        return;
      }
      await json(route, detail);
      return;
    }
    if (method === "PATCH") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      await json(route, { id, ...body, updated_at: new Date().toISOString() });
      return;
    }
    await route.continue();
  });
}

/** GET/POST /api/playbook/storyboards + GET /api/playbook/storyboards/[id] —
 *  save returns a synthetic id; the list starts pre-seeded with one saved
 *  storyboard (library screenshot) and grows with anything saved in-test. */
export async function mockStoryboards(page: Page) {
  const saved = new Map<string, unknown>();
  for (const item of STORYBOARD_LIST_FIXTURE) {
    saved.set(item.id, item);
  }

  await page.route("**/api/playbook/storyboards", async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await json(route, Array.from(saved.values()));
      return;
    }
    if (method === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      const id = uuid();
      const row = {
        id,
        idea: body.idea,
        answers: body.answers ?? null,
        frames: body.frames,
        title_options: body.titleOptions,
        chosen_title: body.chosenTitle ?? null,
        caption: body.caption,
        posting_window: body.postingWindow,
        created_at: new Date().toISOString(),
      };
      saved.set(id, row);
      await json(route, row, 201);
      return;
    }
    await route.continue();
  });

  await page.route("**/api/playbook/storyboards/*", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    const id = route.request().url().split("/").pop() as string;
    const row = saved.get(id);
    if (!row) {
      await json(route, { error: `No storyboard with id "${id}".` }, 404);
      return;
    }
    await json(route, row);
  });
}

/** Registers every mock this app's data surface needs. Call once per test
 *  before navigating to /megs-playbook. */
export async function mockAll(page: Page) {
  await Promise.all([
    mockGenerationJobs(page),
    mockTips(page),
    mockRecommendation(page),
    mockPosts(page),
    mockChecklist(page),
    mockOutreach(page),
    mockStoryboards(page),
  ]);
}
