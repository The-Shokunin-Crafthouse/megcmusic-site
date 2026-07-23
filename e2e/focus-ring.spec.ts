import { test, expect } from "@playwright/test";
import { mockAll } from "./fixtures/mocks";
import { gotoPastFirstRun } from "./fixtures/helpers";

// Test 9 — Focus ring (--pb-focus-ring token, _config/design-system/
// token-map.css line ~332: #f7eadd = rgb(247, 234, 221)). Applied via
// TapScale.module.css's `.pressable:focus-visible { outline: 2px solid
// var(--pb-focus-ring); }`, the shared pressable primitive behind nearly
// every interactive control in this app.
test.describe("focus ring", () => {
  test.beforeEach(async ({ page }) => {
    await mockAll(page);
    await gotoPastFirstRun(page);
  });

  test("keyboard focus resolves the focus-ring token as its outline color", async ({ page }) => {
    await page.getByRole("region", { name: "Your Next Post" }).waitFor();

    await page.keyboard.press("Tab");

    const focused = page.locator(":focus-visible");
    await expect(focused).toHaveCount(1);

    const outlineColor = await focused.evaluate((el) => getComputedStyle(el).outlineColor);
    expect(outlineColor).toBe("rgb(247, 234, 221)");
  });
});
