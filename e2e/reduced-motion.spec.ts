import { test, expect } from "@playwright/test";
import { mockAll } from "./fixtures/mocks";
import { gotoPastFirstRun } from "./fixtures/helpers";

// Test 8 — Reduced motion (functional path, not animation completion).
// Every motion primitive in this app (`useReducedMotion()` from
// framer-motion) branches to an instant/opacity-only transition under
// `prefers-reduced-motion: reduce` — this test only proves the *paths*
// still work, not that any transform is skipped (that's a visual/CSS
// concern, not a Playwright-testable one without pixel diffing).
test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test.beforeEach(async ({ page }) => {
    await mockAll(page);
    await gotoPastFirstRun(page);
  });

  test("tab switch and the creation take-over both still work", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Your Next Post" })).toBeVisible();

    await page.getByRole("button", { name: "Checklist", exact: true }).click();
    await expect(page.getByText(/of 8 done/)).toBeVisible();

    await page.getByRole("button", { name: "Home", exact: true }).click();
    await expect(page.getByRole("region", { name: "Your Next Post" })).toBeVisible();

    await page.getByRole("button", { name: "Let's go!" }).click();
    await expect(page.getByRole("textbox", { name: "Your idea" })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Create a new post" })).toBeVisible();

    await page.getByRole("button", { name: "Exit", exact: true }).click();
    await expect(page.getByText("Leave this idea?")).toBeVisible();
    await page.getByRole("button", { name: "Keep working" }).click();
    await expect(page.getByText("Leave this idea?")).toHaveCount(0);
  });
});
