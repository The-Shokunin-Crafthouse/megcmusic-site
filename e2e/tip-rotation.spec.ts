import { test, expect } from "@playwright/test";
import {
  mockGenerationJobs,
  mockTips,
  mockRecommendation,
  mockPosts,
  mockOutreach,
  mockStoryboards,
  mockChecklist,
} from "./fixtures/mocks";
import { gotoPastFirstRun } from "./fixtures/helpers";

// Test 7 — Tip rotation (Home's Daily Insight card, TipCard.tsx +
// usePlaybookData.ts's useTip). The mock's GET /api/playbook/tips route is
// stateful per surface (fixtures/mocks.ts's `mockTips`) and returns a
// different body on each successive call for the same surface, mirroring
// the real route's "least-recently-shown" rotation. This only proves the
// UI renders whatever the server serves it — the real selection algorithm
// (least-recently-shown / deterministic-daily hashing) is server logic that
// can only be exercised once the generation_jobs/tips migration is applied
// and a real GET /api/playbook/tips is live (go-live item, per the sprint
// contract).
test.describe("tip rotation", () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      mockGenerationJobs(page),
      mockTips(page),
      mockRecommendation(page),
      mockPosts(page),
      mockOutreach(page),
      mockStoryboards(page),
      mockChecklist(page),
    ]);
  });

  test("Home's Daily Insight tip differs across a reload", async ({ page }) => {
    await gotoPastFirstRun(page);

    const tipLocator = page.getByText(
      /Reels with a spoken hook|Posts that name a specific venue/,
    );
    await expect(tipLocator).toBeVisible();
    const firstTip = await tipLocator.textContent();

    await page.reload();

    const tipLocatorAfterReload = page.getByText(
      /Reels with a spoken hook|Posts that name a specific venue/,
    );
    await expect(tipLocatorAfterReload).toBeVisible();
    const secondTip = await tipLocatorAfterReload.textContent();

    expect(secondTip).not.toBe(firstTip);
  });
});
