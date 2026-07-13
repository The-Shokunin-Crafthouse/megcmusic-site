import { test, expect, type Page } from "@playwright/test";
import { mockAll } from "./fixtures/mocks";
import { gotoPastFirstRun } from "./fixtures/helpers";

// Design-record screenshots (P8 charter) — full-viewport (390x844), mocked
// data, waited to a settled (non-mid-animation) state. Written to
// stages/02-design/claude-design/playbook-redesign/, NOT committed by this
// agent (see repo learning #28 — the live PR-preview URL is the durable
// visual record; these are a local design-record artifact for this pass).
const OUT_DIR = "stages/02-design/claude-design/playbook-redesign";

async function settle(page: Page, ms = 700) {
  await page.waitForTimeout(ms);
}

async function shoot(page: Page, name: string) {
  await page.screenshot({ path: `${OUT_DIR}/${name}`, animations: "allow" });
}

// See creation-flow.spec.ts's `gotoQuestion` header comment: StackNavigator
// keeps the exiting question mounted (and re-rendering off live store
// state) for ~400-600ms, so a fixed wait right after a click that has a
// delayed effect (single/yes_no's 220ms auto-advance) can pass before the
// transition even starts. Wait for the destination heading, then for the
// heading count to settle back to 1.
async function gotoQuestion(page: Page, headingText: string | RegExp) {
  await expect(page.getByText(headingText).first()).toBeVisible({ timeout: 3000 });
  await expect(page.locator("h1")).toHaveCount(1, { timeout: 3000 });
}

test.describe("design record screenshots", { tag: "@shots" }, () => {
  test("first-run", async ({ page }) => {
    await mockAll(page);
    await page.goto("/megs-playbook");
    await expect(page.getByRole("heading", { name: "Hey Meg." })).toBeVisible();
    await settle(page);
    await shoot(page, "10-first-run.png");
  });

  test("home / stats / booking / venue sheet / checklist", async ({ page }) => {
    await mockAll(page);
    await gotoPastFirstRun(page);

    await expect(page.getByRole("region", { name: "Your Next Post" })).toBeVisible();
    await expect(page.getByText("Backstage before Friday's show")).toBeVisible();
    await settle(page);
    await shoot(page, "01-home.png");

    await page.getByRole("button", { name: "Stats", exact: true }).click();
    await expect(page.getByRole("list").getByText("Backstage before the Skylark Lounge")).toBeVisible();
    await settle(page);
    await shoot(page, "02-stats.png");

    await page.getByRole("button", { name: "Booking", exact: true }).click();
    await expect(page.getByText("Pipeline")).toBeVisible();
    const venueRow = page.getByRole("button", { name: "The Skylark Lounge — view details" });
    await expect(venueRow).toBeVisible();
    await settle(page);
    await shoot(page, "03-booking.png");

    // Checklist next, before opening the venue sheet — BottomSheet's
    // 85dvh snap covers the whole tab bar and (on this screen) the chip
    // row it would otherwise be dismissed by tapping, so there's no clean
    // "tap outside" to close it and get back to tab navigation; simplest
    // is to visit every tab first and open the sheet last.
    await page.getByRole("button", { name: "Checklist", exact: true }).click();
    await expect(page.getByText(/of 8 done/)).toBeVisible();
    await settle(page);
    await shoot(page, "05-checklist.png");

    await page.getByRole("button", { name: "Booking", exact: true }).click();
    await expect(venueRow).toBeVisible();
    await venueRow.click();
    await expect(page.getByText(/I'd love to play a show at The Skylark Lounge/)).toBeVisible({
      timeout: 5000,
    });
    await settle(page);
    await shoot(page, "04-booking-venue-sheet.png");
  });

  test("idea entry / question / storyboard result / library", async ({ page }) => {
    await mockAll(page);
    await gotoPastFirstRun(page);

    await page.getByRole("button", { name: "Let's go!" }).click();
    await expect(page.getByRole("textbox", { name: "Your idea" })).toBeVisible();
    await settle(page);
    await shoot(page, "06-idea-entry.png");

    await page.getByRole("button", { name: "Generate Storyboard" }).click();
    await gotoQuestion(page, "Which vibes fit this idea best?");
    await settle(page);
    await shoot(page, "07-question-multiselect.png");

    // Race through the remaining five questions to reach the storyboard
    // result screen for the 08 shot.
    await page.getByRole("button", { name: "Behind-the-scenes" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await gotoQuestion(page, "What's the main goal for this post?");

    await page.getByRole("button", { name: "Promote an upcoming show" }).click();
    await gotoQuestion(page, "Where was this filmed, or where will it be?");

    await page
      .getByRole("textbox", { name: "Where was this filmed, or where will it be?" })
      .fill("Backstage.");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await gotoQuestion(page, "Tell me the real story here");

    await page
      .getByRole("textbox", { name: /Tell me the real story here/ })
      .fill("The last show before two months in the studio.");
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await gotoQuestion(page, "Do you already have footage or photos for this");

    await page.getByRole("button", { name: "Yes", exact: true }).click();
    await gotoQuestion(page, "How raw vs. polished do you want this one to feel?");

    await page.getByRole("button", { name: "3", exact: true }).click();
    await page.getByRole("button", { name: "Generate Storyboard" }).click();

    await expect(page.getByRole("heading", { name: "Your storyboard" })).toBeVisible({
      timeout: 10_000,
    });
    await settle(page, 900);
    await shoot(page, "08-storyboard-result.png");

    // Save it, then open the library for the 09 shot.
    await page
      .getByRole("radiogroup", { name: "Pick a title" })
      .getByRole("radio")
      .first()
      .click();
    await page.getByRole("button", { name: "Save to library" }).click();
    await expect(page.getByText("Saved ✓ — View in library")).toBeVisible();
    await page.getByRole("button", { name: "Saved — view in library" }).click();

    await expect(page.getByText("Storyboards")).toBeVisible();
    await settle(page);
    await shoot(page, "09-library.png");
  });
});
