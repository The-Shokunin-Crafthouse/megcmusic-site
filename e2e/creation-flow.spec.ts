import { test, expect, type Page } from "@playwright/test";
import { mockAll } from "./fixtures/mocks";
import { gotoPastFirstRun } from "./fixtures/helpers";

// Test 4 — Full creation flow with mocks, all six question types
// (IdeaEntry -> QuestionPage x6 -> generating -> StoryboardResult). Uses the
// committed questions.json fixture, which covers exactly one of each
// question type in order: multiselect, single, text_short, text_long,
// yes_no, scale.

// StackNavigator pushes/pops with a stiffness-400/damping-40 spring
// (motion/springs.ts). During that ~400-600ms exit transition the outgoing
// QuestionPage instance stays mounted (AnimatePresence keeps it around to
// animate out) but keeps re-rendering off the *live* Zustand
// `questionIndex` rather than a frozen snapshot — so for that window there
// are genuinely two <h1> headlines with identical text in the DOM
// (confirmed by direct measurement). `single`/`yes_no` compound this: the
// transition itself doesn't start until the 220ms auto-advance timer
// fires, so polling for settle *immediately* after the click (before that
// timer runs) passes trivially and misses the transition entirely. Every
// navigating step below waits for the destination heading to appear
// first, then polls the heading count back to 1 before the next action.
async function gotoQuestion(page: Page, headingText: string | RegExp) {
  await expect(page.getByText(headingText).first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator("h1")).toHaveCount(1, { timeout: 3000 });
}

test.describe("creation flow", () => {
  test.beforeEach(async ({ page }) => {
    await mockAll(page);
    await gotoPastFirstRun(page);
  });

  test("idea -> make it better -> six question types -> storyboard -> save", async ({
    page,
  }) => {
    // ---- Home -> "Let's go!" (seeds idea) ----
    await page.getByRole("button", { name: "Let's go!" }).click();

    const ideaBox = page.getByRole("textbox", { name: "Your idea" });
    await expect(ideaBox).toBeVisible();
    await expect(ideaBox).toHaveValue(
      "A behind-the-scenes look at my pre-show ritual before Friday's set at The Skylark Lounge.",
    );

    // ---- Make it better ----
    await page.getByRole("button", { name: "Make it better" }).click();
    await expect(page.getByText(/^Why:/)).toBeVisible();
    await expect(
      ideaBox,
    ).toHaveValue(/Film the moment you first played "Tuesday Night" live/);
    await expect(page.getByText(/^Before:/)).toBeVisible();

    await page.getByRole("button", { name: "Keep it" }).click();
    await expect(page.getByText(/^Why:/)).toHaveCount(0);

    // ---- Generate Storyboard -> questions ----
    await page.getByRole("button", { name: "Generate Storyboard" }).click();
    await gotoQuestion(page, "Which vibes fit this idea best?");

    // Q1 — multiselect ("Choose 1–3"), select 2 within max.
    await page.getByRole("button", { name: "Behind-the-scenes" }).click();
    await page.getByRole("button", { name: "Live performance clip" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await gotoQuestion(page, "What's the main goal for this post?");

    // Q2 — single, auto-advances.
    await page.getByRole("button", { name: "Promote an upcoming show" }).click();
    await gotoQuestion(page, "Where was this filmed, or where will it be?");

    // ---- Back once mid-flow, then re-answer Q2 ----
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await gotoQuestion(page, "What's the main goal for this post?");
    await page.getByRole("button", { name: "Tease a new song" }).click();
    await gotoQuestion(page, "Where was this filmed, or where will it be?");

    // Q3 — text_short (optional).
    await page
      .getByRole("textbox", { name: "Where was this filmed, or where will it be?" })
      .fill("Backstage at the Skylark Lounge");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await gotoQuestion(page, "Tell me the real story here");

    // Q4 — text_long (required).
    await page
      .getByRole("textbox", { name: /Tell me the real story here/ })
      .fill("It's the last show before I head into the studio for two months.");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await gotoQuestion(page, "Do you already have footage or photos for this");

    // Q5 — yes_no, auto-advances.
    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await gotoQuestion(page, "How raw vs. polished do you want this one to feel?");

    // Q6 — scale, tap 4, then submit (last question).
    await page.getByRole("button", { name: "4", exact: true }).click();
    await page.getByRole("button", { name: "Generate Storyboard" }).click();

    // ---- Generating -> storyboard result ----
    await expect(page.getByText("Building your storyboard")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your storyboard" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText("6 frames")).toBeVisible();

    const frameCards = page.getByText(/^Frame \d — /);
    await expect(frameCards).toHaveCount(6);

    const titleGroup = page.getByRole("radiogroup", { name: "Pick a title" });
    await expect(titleGroup.getByRole("radio")).toHaveCount(4);

    // ---- Pick a title -> Save -> View in library ----
    await titleGroup.getByRole("radio").first().click();
    const savePill = page.getByRole("button", { name: "Save to library" });
    await expect(savePill).toBeVisible();
    await savePill.click();

    await expect(
      page.getByRole("button", { name: "Saved — view in library" }),
    ).toBeVisible();
    await expect(page.getByText("Saved ✓ — View in library")).toBeVisible();
  });
});
