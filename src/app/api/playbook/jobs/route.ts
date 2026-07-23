/**
 * POST /api/playbook/jobs — page-facing (unguarded — internal, noindexed,
 * unlinked PWA; the generation queue has no separate auth scheme, PLAN.md
 * §2/§5). Enqueues a generation job for the local daemon
 * (`agent/playbook-agent.mjs`) to pick up.
 *
 * Only the four page-creatable kinds may be enqueued from here —
 * `tip_derivation`/`tip_review` are machine-enqueued by the stats/playbook
 * sync routes, so a page-originated request for either is refused (403)
 * rather than silently accepted.
 *
 * Mock mode (`MOCK_GENERATION=1`): the row is inserted already `done` with
 * `output` loaded from the matching committed fixture
 * (`src/app/megs-playbook/__fixtures__/*.json`), so the whole creation flow
 * is testable without the daemon running.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, ok } from "@/lib/playbook/http";
import {
  isJobKind,
  isPageCreatableKind,
  parseJobInput,
  type PageCreatableKind,
} from "@/lib/playbook/generation";

import questionsFixture from "@/app/megs-playbook/__fixtures__/questions.json";
import storyboardFixture from "@/app/megs-playbook/__fixtures__/storyboard.json";
import makeItBetterFixture from "@/app/megs-playbook/__fixtures__/make_it_better.json";
import titlesFixture from "@/app/megs-playbook/__fixtures__/titles.json";

export const dynamic = "force-dynamic";

const MOCK_FIXTURES: Record<PageCreatableKind, unknown> = {
  questions: questionsFixture,
  storyboard: storyboardFixture,
  make_it_better: makeItBetterFixture,
  titles: titlesFixture,
};

function isMockMode(): boolean {
  return process.env.MOCK_GENERATION === "1";
}

export async function POST(req: Request): Promise<Response> {
  try {
    const raw = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (typeof raw !== "object" || raw === null) {
      return fail("Malformed request body.", 400);
    }

    const kind = raw.kind;
    if (!isJobKind(kind)) {
      return fail(`Unknown job kind "${String(kind)}".`, 400);
    }
    if (!isPageCreatableKind(kind)) {
      return fail(
        `Job kind "${kind}" is machine-enqueued only and cannot be created from the page.`,
        403,
      );
    }

    const parsedInput = parseJobInput(kind, raw.input);
    if (!parsedInput.success) {
      return fail(`Invalid input for "${kind}" job: ${parsedInput.error}`, 400);
    }

    const db = appDb();
    const mock = isMockMode();

    const insertRes = await db
      .from("generation_jobs")
      .insert({
        kind,
        status: mock ? "done" : "queued",
        input: parsedInput.data,
        output: mock ? MOCK_FIXTURES[kind] : null,
      })
      .select("id, status")
      .single();
    if (insertRes.error) return fail(insertRes.error.message, 502);

    return ok(insertRes.data, 201);
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Failed to enqueue job.",
      500,
    );
  }
}
