import type { Page } from "@playwright/test";

/** Skips FirstRun by pre-seeding its localStorage flag before first paint,
 *  then navigates. Every spec other than first-run.spec.ts wants Home (or
 *  whichever tab) immediately interactive, not blocked behind the overlay. */
export async function gotoPastFirstRun(page: Page, path = "/megs-playbook") {
  await page.addInitScript(() => {
    window.localStorage.setItem("pb-first-run-done", "1");
  });
  await page.goto(path);
}
