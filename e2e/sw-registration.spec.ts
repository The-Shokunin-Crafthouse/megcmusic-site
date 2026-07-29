import { test, expect } from "@playwright/test";
import { mockAll } from "./fixtures/mocks";

// Regression — service-worker registration must never throw into the page.
//
// `@serwist/window`'s `register()` reads `registration.waiting` off the
// result of `navigator.serviceWorker.register()` with no null check, and
// `<SerwistProvider register>` fires that promise with no rejection handler.
// Wherever registration resolves to nothing — this suite's
// `serviceWorkers: "block"` (playwright.config.ts), a browser with service
// workers disabled, a non-secure context — that read threw
// `Cannot read properties of undefined (reading 'waiting')` as an unhandled
// rejection at boot and took the playbook client tree with it. Registration
// is now owned by `<ServiceWorkerRegistrar>` in PlaybookProviders.tsx, which
// catches it: no offline support, a working shell.
test.describe("service worker registration", () => {
  test("a blocked registration degrades quietly and still boots the shell", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await mockAll(page);
    await page.goto("/megs-playbook");

    // The client tree mounts: the first-run gate and the shell behind it.
    await expect(page.getByRole("dialog", { name: "Welcome to your playbook" })).toBeVisible();
    await page.getByRole("button", { name: "Let's look around" }).click();
    await expect(page.getByRole("navigation", { name: "Playbook sections" })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });
});
