import { test, expect } from "@playwright/test";
import { mockAll } from "./fixtures/mocks";
import { gotoPastFirstRun } from "./fixtures/helpers";

// Test 3 — Tab navigation + transitions render (PlaybookShell + TabSwitch,
// specs.md §9). Asserts both that each panel's distinguishing text shows up
// AND that the previous panel's root actually unmounts (panel count back to
// 1) — catches a stuck AnimatePresence exit that a text-only assertion
// would miss.
test.describe("tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    await mockAll(page);
    await gotoPastFirstRun(page);
  });

  // TabSwitch's AnimatePresence stage: structurally, PlaybookShell's
  // `.wrap` div renders <TabSwitch>'s `.stage` div first, then <BottomNav>'s
  // two elements (the home mark + the `nav[aria-label="Playbook sections"]`
  // pill) as siblings — so "the pill's parent's first child" is always the
  // stage, regardless of CSS-module hash naming. Its child count is 1 at
  // rest and 2 mid-crossfade; polling back to <=1 catches a stuck exit.
  async function stagePanelCount(page: import("@playwright/test").Page) {
    return page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Playbook sections"]');
      const wrap = nav?.parentElement;
      const stage = wrap?.firstElementChild;
      return stage?.children.length ?? -1;
    });
  }

  test("Stats / Booking / Checklist / Home each render and the prior panel unmounts", async ({
    page,
  }) => {
    await expect(page.getByRole("region", { name: "Your Next Post" })).toBeVisible();

    await page.getByRole("button", { name: "Stats", exact: true }).click();
    await expect(page.getByRole("group", { name: "Sort and filter posts" })).toBeVisible();
    // Scoped to the Stats post list: TabSwitch crossfades panels (`mode:
    // "sync"`), so Home's own "Last Post" block — same fixture caption —
    // can still be mid-exit in the DOM at this point too.
    await expect(page.getByRole("list").getByText("Backstage before the Skylark Lounge")).toBeVisible();

    await page.getByRole("button", { name: "Booking", exact: true }).click();
    await expect(page.getByText("Pipeline")).toBeVisible();
    await expect(page.getByRole("group", { name: "Booking filters" })).toBeVisible();

    await page.getByRole("button", { name: "Checklist", exact: true }).click();
    await expect(page.getByText(/of 8 done/)).toBeVisible();

    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByRole("region", { name: "Your Next Post" })).toBeVisible();

    // After settling on Home again, exactly one screen node should remain
    // in the DOM under TabSwitch's AnimatePresence — not two overlapping
    // exit/enter panels.
    await expect
      .poll(async () => stagePanelCount(page), { timeout: 5000 })
      .toBeLessThanOrEqual(1);
  });
});
