import { test, expect } from "@playwright/test";
import { mockAll } from "./fixtures/mocks";

// Test 2 — First-run gate (FirstRun.tsx, specs.md §"Screen 10").
test.describe("first-run gate", () => {
  test.beforeEach(async ({ page }) => {
    await mockAll(page);
  });

  test("shows on first visit, dismisses to Home, and never reappears on reload", async ({
    page,
  }) => {
    await page.goto("/megs-playbook");

    const dialog = page.getByRole("dialog", { name: "Welcome to your playbook" });
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hey Meg." })).toBeVisible();

    const cta = page.getByRole("button", { name: "Let's look around" });
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(dialog).toBeHidden();
    // Home is now interactive underneath.
    await expect(page.getByRole("region", { name: "Your Next Post" })).toBeVisible();

    // localStorage flag set.
    const flag = await page.evaluate(() => window.localStorage.getItem("pb-first-run-done"));
    expect(flag).toBe("1");

    await page.reload();
    await expect(page.getByRole("dialog", { name: "Welcome to your playbook" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Your Next Post" })).toBeVisible();
  });
});
