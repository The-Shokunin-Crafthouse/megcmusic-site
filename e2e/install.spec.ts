import { test, expect } from "@playwright/test";
import { mockAll } from "./fixtures/mocks";

// Test 1 — Install metadata (specs.md §"Screen 9"/"First-run" + PLAN.md's
// installability contract). No product interaction — pure head/manifest
// verification.
test.describe("install metadata", () => {
  test.beforeEach(async ({ page }) => {
    await mockAll(page);
  });

  test("head carries the manifest link and required PWA meta", async ({ page }) => {
    await page.goto("/megs-playbook");

    const manifestHref = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    expect(manifestHref).toBe("/megs-playbook/manifest.webmanifest");

    const viewportContent = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(viewportContent).toContain("viewport-fit=cover");

    // Next 16's metadata resolver emits the unprefixed, standards-track
    // `mobile-web-app-capable` for `appleWebApp.capable` (confirmed against
    // the rendered HTML) rather than the legacy `apple-mobile-web-app-capable`
    // — the other two apple-prefixed tags below are unaffected.
    const mobileCapable = await page
      .locator('meta[name="mobile-web-app-capable"]')
      .getAttribute("content");
    expect(mobileCapable).toBe("yes");

    const appleTitle = await page
      .locator('meta[name="apple-mobile-web-app-title"]')
      .getAttribute("content");
    expect(appleTitle).toBe("Playbook");

    const appleStatusBar = await page
      .locator('meta[name="apple-mobile-web-app-status-bar-style"]')
      .getAttribute("content");
    expect(appleStatusBar).toBe("black-translucent");
  });

  // PRODUCT BUG (confirmed against rendered HTML — no <link rel=
  // "apple-touch-icon"> is ever emitted). File:
  // src/app/megs-playbook/layout.tsx's `metadata` object has no `icons`
  // field, and there is no file-convention apple-icon.png/tsx under
  // src/app/megs-playbook/ — so public/megs-playbook/icons/
  // apple-touch-icon.png (which exists on disk) is never referenced from
  // any <link>. Repro: `curl http://localhost:PORT/megs-playbook | grep
  // apple-touch-icon` — no match, vs. manifest icons which do resolve.
  // Expected: a <link rel="apple-touch-icon" href="/megs-playbook/icons/
  // apple-touch-icon.png"> in <head> (e.g. via
  // `metadata.icons.apple`). Actual: no such link is rendered.
  test("apple-touch-icon link is present", async ({ page }) => {
    await page.goto("/megs-playbook");
    const count = await page.locator('link[rel="apple-touch-icon"]').count();
    expect(count).toBeGreaterThan(0);
  });

  test("manifest.webmanifest resolves with the expected install shape", async ({
    request,
  }) => {
    const res = await request.get("/megs-playbook/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const manifest = await res.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.orientation).toBe("portrait");
    expect(manifest.start_url).toBe("/megs-playbook");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
