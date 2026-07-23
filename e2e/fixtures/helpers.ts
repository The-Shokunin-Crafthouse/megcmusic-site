import type { Page } from "@playwright/test";

/** Skips FirstRun by pre-seeding its localStorage flag before first paint,
 *  then navigates. Every spec other than first-run.spec.ts wants Home (or
 *  whichever tab) immediately interactive, not blocked behind the overlay. */
export async function gotoPastFirstRun(page: Page, path = "/megs-playbook") {
  await page.addInitScript(() => {
    window.localStorage.setItem("pb-first-run-done", "1");
  });
  await page.goto(path);
  await hideDevOverlay(page);
}

/** The Next dev overlay's toast is pinned to the bottom-left corner — the
 *  same corner as the playbook's brand mark, which is its Home control. In
 *  `next dev` (which is what this suite runs against) that toast sits on
 *  top of the control and swallows every click aimed at it. Production
 *  never ships the overlay, so it is suppressed rather than designed
 *  around. */
export async function hideDevOverlay(page: Page) {
  await page
    .addStyleTag({
      content: "nextjs-portal,[data-nextjs-dev-overlay]{display:none !important}",
    })
    .catch(() => {});
}
