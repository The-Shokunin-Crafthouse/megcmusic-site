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

    // ---- reopen -> text restored, and NO resume row ----
    // An idea-only draft is fully restored by the textarea itself, so the
    // resume row has nothing to offer and does not appear. It used to
    // render here with a handler that only dismissed itself; the row now
    // means "re-enter the question you left off on" and is asserted in the
    // question-draft test below.
    await startIdea.click();
    await expect(ideaBox).toHaveValue(DRAFT_TEXT);
    await expect(page.getByRole("button", { name: /^Pick up where you left off/ })).toHaveCount(0);

    // ---- exit -> Discard draft ----
    await exitBar.click();
    await expect(page.getByText("Leave this idea?")).toBeVisible();
    await page.getByRole("button", { name: "Discard draft" }).click();
    await expect(page.getByText("Leave this idea?")).toHaveCount(0);

    // ---- reopen -> clean textarea, no restore row ----
    await startIdea.click();
    await expect(ideaBox).toBeVisible();
    await expect(ideaBox).toHaveValue("");
    await expect(page.getByRole("button", { name: /^Pick up where you left off/ })).toHaveCount(0);
  });

  // A draft put down mid-questions has to come back mid-questions. Before
  // the draft slice carried the question set, the answers survived in
  // localStorage while the questions they belonged to did not, so the only
  // reachable state was the idea screen with every answer stranded.
  test("a draft saved mid-questions resumes at that question with its answers", async ({ page }) => {
    const startIdea = page.getByRole("button", { name: "Start your own idea" });
    const ideaBox = page.getByRole("textbox", { name: "Your idea" });
    const exitBar = page.getByRole("button", { name: "Exit", exact: true });

    await startIdea.click();
    await ideaBox.fill(DRAFT_TEXT);
    await page.getByRole("button", { name: /Generate\s+Storyboard/ }).click();

    // q1 (multiselect) -> q2, so the draft is put down on a question that
    // is neither the first nor the last.
    const q1 = "Which vibes fit this idea best?";
    const q2 = "What's the main goal for this post?";
    await expect(page.getByText(q1).first()).toBeVisible();
    await page.getByRole("button", { name: "Behind-the-scenes" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText(q2).first()).toBeVisible();
    // The push mounts two screens (and so two Exit bars) until the
    // outgoing one unmounts — wait for the stack to settle to one.
    await expect(page.locator("h1")).toHaveCount(1);

    await exitBar.click();
    await page.getByRole("button", { name: "Save draft & exit" }).click();
    await expect(startIdea).toBeVisible();

    // ---- reopen -> the row names the question and lands on it ----
    await startIdea.click();
    const resume = page.getByRole("button", { name: /^Pick up where you left off/ });
    await expect(resume).toBeVisible();
    await expect(resume).toContainText("question 2 of 6");
    await resume.click();
    await expect(page.getByText(q2).first()).toBeVisible();

    // ---- and the answer given before exiting is still selected ----
    // Multiselect communicates its state through the filled/empty icon
    // swap, so that is what the assertion reads.
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(page.getByText(q1).first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Behind-the-scenes" }).locator("[class*='rowIconChecked']"),
    ).toHaveCount(1);
  });
});
