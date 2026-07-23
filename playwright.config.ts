import { defineConfig, devices } from "@playwright/test";

// P8 test harness for the Megs Playbook PWA (playbook-redesign branch).
// Chromium only, one iPhone-12-ish mobile project — this surface is
// mobile-only per the sprint contract (no desktop breakpoint to cover).
// `MOCK_GENERATION=1` makes POST /api/playbook/jobs insert an already-done
// row (still hits the DB — every data route is still network-mocked in the
// specs themselves since the generation_jobs/storyboards/tips/
// checklist_state migration isn't applied to the dev DB yet).
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3021",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The route registers Serwist's SW (PlaybookProviders.tsx). An active
    // SW intercepts fetches in its own worker context — some requests
    // (confirmed: GET /api/playbook/jobs/[id]) bypass page.route()'s
    // page-level network interception entirely and hit the real dev
    // server, which 502s with no DB. This suite doesn't exercise
    // offline/SW behavior, so blocking registration keeps every request
    // on the page-level network path the mocks intercept.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "iphone-12",
      use: {
        ...devices["iPhone 12"],
        // The "iPhone 12" device preset implies WebKit; this suite is
        // chromium-only (P8 charter), so browserName is forced back after
        // the spread pulls in the rest of the device's UA/viewport/touch
        // fields.
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        contextOptions: {
          reducedMotion: null,
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3021",
    url: "http://localhost:3021/megs-playbook",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      MOCK_GENERATION: "1",
    },
  },
});
