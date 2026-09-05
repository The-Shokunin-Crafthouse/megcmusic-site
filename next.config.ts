import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";

const nextConfig: NextConfig = {
  // Headroom over the 60s default so a slow upstream during prerender can't
  // fail the build; paired with the 25s fetch timeout + 1 retry in
  // src/lib/api/events.ts (worst case ~50s/fetch across paginated calls).
  staticPageGenerationTimeout: 180,
  async redirects() {
    return [
      // /fyc has no page of its own — it permanently points at the CURRENT
      // campaign (old /fyc links from the 2024 cycle keep working). Retarget
      // this when a future campaign ships; keep it in lockstep with the FYC
      // nav href (navItems.ts) and FYC_PAGE_IDS in src/lib/fyc-content.ts.
      {
        source: "/fyc",
        destination: "/fyc/shadows-of-a-ghost-town",
        permanent: true,
      },
      // The campaign's old WordPress path, shared before the cutover — those
      // links now land on the apex, where they 404 without this.
      {
        source: "/shadows-of-a-ghost-town",
        destination: "/fyc/shadows-of-a-ghost-town",
        permanent: true,
      },
    ];
  },
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
