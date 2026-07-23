import { test, expect } from "@playwright/test";
import { mockAll, mockRecommendationEmpty } from "./fixtures/mocks";
import { gotoPastFirstRun } from "./fixtures/helpers";

// Test 5 — Back/exit behavior (ExitConfirm.tsx, specs.md §9.5). Uses Home's
// unseeded "Start your own idea" entry point (mockRecommendationEmpty) so
// re-entering the flow never re-seeds over the persisted draft — the real
// "Let's go!" entry always calls startCreation(seedIdea), which would
// overwrite the draft on every re-entry and make the restore row
// unobservable in a mocked, deterministic-recommendation test.
test.describe("exit / draft behavior", () => {
  test.beforeEach(async ({ page }) => {
    await mockAll(page);
    await mockRecommendationEmpty(page);
    await gotoPastFirstRun(page);
  });

  const DRAFT_TEXT = "A quick clip of tonight's soundcheck, unedited.";

  test("save draft & exit persists the draft; discard draft clears it", async ({ page }) => {
    const startIdea = page.getByRole("button", { name: "Start your own idea" });
    const ideaBox = page.getByRole("textbox", { name: "Your idea" });
    const exitBar = page.getByRole("button", { name: "Exit", exact: true });

    // ---- enter, type, exit -> confirm sheet ----
    await startIdea.click();
    await expect(ideaBox).toBeVisible();
    await ideaBox.fill(DRAFT_TEXT);
    await exitBar.click();

    await expect(page.getByText("Leave this idea?")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save draft & exit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Keep working" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Discard draft" })).toBeVisible();

    // ---- Save draft & exit ----
    await page.getByRole("button", { name: "Save draft & exit" }).click();
    await expect(page.getByText("Leave this idea?")).toHaveCount(0);
    await expect(startIdea).toBeVisible();

    // ---- reopen -> draft restore row + text present ----
    await startIdea.click();
    await expect(page.getByRole("button", { name: "Pick up where you left off →" })).toBeVisible();
    await expect(ideaBox).toHaveValue(DRAFT_TEXT);

    // ---- exit -> Discard draft ----
    await exitBar.click();
    await expect(page.getByText("Leave this idea?")).toBeVisible();
    await page.getByRole("button", { name: "Discard draft" }).click();
    await expect(page.getByText("Leave this idea?")).toHaveCount(0);

    // ---- reopen -> clean textarea, no restore row ----
    await startIdea.click();
    await expect(ideaBox).toBeVisible();
    await expect(ideaBox).toHaveValue("");
    await expect(page.getByRole("button", { name: "Pick up where you left off →" })).toHaveCount(0);
  });
});
