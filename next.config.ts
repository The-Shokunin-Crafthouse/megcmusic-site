import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  // Headroom over the 60s default so a slow upstream during prerender can't
  // fail the build; paired with the 25s fetch timeout + 1 retry in
  // src/lib/api/events.ts (worst case ~50s/fetch across paginated calls).
  staticPageGenerationTimeout: 180,
};

// Sprint 10 — Megs Playbook PWA shell. `@serwist/turbopack` (not
// `@serwist/next`) because this repo builds under Turbopack by default
// (Next 16) and `@serwist/next` injects a webpack config, which Turbopack
// rejects outright at build time ("using Turbopack, with a webpack config
// and no turbopack config"). `@serwist/turbopack` instead serves the
// compiled worker through a route handler
// (src/app/serwist/[path]/route.ts) — see that file for the build options
// (swSrc, precache entries) that `@serwist/next` would have taken here.
// Registration is opt-in per surface via `<SerwistProvider>`
// (PlaybookProviders.tsx), mounted only under /megs-playbook — the rest of
// the site is not a PWA.
export default withSerwist(nextConfig);
