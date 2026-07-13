import { test, expect } from "@playwright/test";
import { mockGenerationJobs, mockRecommendationEmpty, mockTips, mockPosts, mockOutreach, mockChecklist, mockStoryboards } from "./fixtures/mocks";
import { gotoPastFirstRun } from "./fixtures/helpers";

// REGRESSION GUARD — this file originally documented a live product bug
// (fixed 2026-07-12, same session): `useCreateJob`'s cache seed carried the
// POST response's status verbatim, so a MOCK_GENERATION=1 job (whose row is
// inserted already-"done") seeded the cache as done-with-null-output, and
// IdeaEntry's effects — which then branched on `status === "done"` alone —
// consumed the seed before the first real poll delivered the output:
// "Make it better" silently reverted to idle, "Generate Storyboard" showed
// a false error. Two fixes, both guarded here by reproducing the REAL
// mock-mode server shape (POST answers "done" immediately) instead of the
// "queued" shape the other specs use:
//  1. useGenerationJob.ts: the seed's status is pinned to "queued".
//  2. IdeaEntry.tsx: both effects require `output !== null` alongside
//     status "done" (matching CreationFlow's existing guard).

test.describe("generation-race regression", () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      mockGenerationJobs(page, { postStatus: "done" }), // real MOCK_GENERATION=1 shape
      mockTips(page),
      mockRecommendationEmpty(page),
      mockPosts(page),
      mockOutreach(page),
      mockChecklist(page),
      mockStoryboards(page),
    ]);
    await gotoPastFirstRun(page);
  });

  test(
    "Make it better completes under real MOCK_GENERATION=1 semantics",
    async ({ page }) => {
      await page.getByRole("button", { name: "Start your own idea" }).click();
      await page.getByRole("textbox", { name: "Your idea" }).fill("A show night story.");
      await page.getByRole("button", { name: "Make it better" }).click();
      // Expected: the sharpened idea + "Why:" compare strip. Actual: the
      // button silently reverts to "Make it better" with no state change
      // and no visible error.
      await expect(page.getByText(/^Why:/)).toBeVisible({ timeout: 3000 });
    },
  );

  test(
    "Generate Storyboard renders questions under real MOCK_GENERATION=1 semantics",
    async ({ page }) => {
      await page.getByRole("button", { name: "Start your own idea" }).click();
      await page.getByRole("textbox", { name: "Your idea" }).fill("A show night story.");
      await page.getByRole("button", { name: "Generate Storyboard" }).click();
      // Expected: the six-question fixture renders. Actual: GenerationWait's
      // error state ("That one didn't come together.") appears instead,
      // even though a fully valid questions payload was one round-trip away.
      await expect(page.getByText("Which vibes fit this idea best?")).toBeVisible({
        timeout: 3000,
      });
    },
  );
});
