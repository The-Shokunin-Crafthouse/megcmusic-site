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

// Test 6 — Checklist persistence UI (useChecklistState.ts). Verifies the
// UI contract only: toggling optimistically checks, and a GET that returns
// previously-checked items renders them checked on load. Real cross-session
// DB persistence is a go-live verification item (checklist_state migration
// isn't applied to the dev DB this suite runs against).
test.describe("checklist persistence (UI contract)", () => {
  test.beforeEach(async ({ page }) => {
    await Promise.all([
      mockGenerationJobs(page),
      mockTips(page),
      mockRecommendation(page),
      mockPosts(page),
      mockOutreach(page),
      mockStoryboards(page),
    ]);
    await mockChecklist(page); // starts from {} — every item unchecked
    await gotoPastFirstRun(page);
  });

  test("toggling two items checks them, and they render checked after reload", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Checklist", exact: true }).click();

    const hookRow = page.getByRole("checkbox", { name: /Hook lands in the first/ });
    const watermarkRow = page.getByRole("checkbox", { name: /No TikTok or CapCut watermark/ });

    await expect(hookRow).toHaveAttribute("aria-checked", "false");
    await expect(watermarkRow).toHaveAttribute("aria-checked", "false");

    await hookRow.click();
    await expect(hookRow).toHaveAttribute("aria-checked", "true");

    await watermarkRow.click();
    await expect(watermarkRow).toHaveAttribute("aria-checked", "true");

    await expect(page.getByText("2 of 8 done")).toBeVisible();

    // The mock's PUT handler persisted both toggles into its in-memory map;
    // a reload re-fetches GET /api/playbook/checklist against that same
    // stateful route and should come back with both items checked.
    await page.reload();
    await page.getByRole("button", { name: "Checklist", exact: true }).click();

    const hookRowAfterReload = page.getByRole("checkbox", { name: /Hook lands in the first/ });
    const watermarkRowAfterReload = page.getByRole("checkbox", {
      name: /No TikTok or CapCut watermark/,
    });
    await expect(hookRowAfterReload).toHaveAttribute("aria-checked", "true");
    await expect(watermarkRowAfterReload).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("2 of 8 done")).toBeVisible();
  });
});
