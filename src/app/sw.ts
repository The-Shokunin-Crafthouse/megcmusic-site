/// <reference lib="webworker" />
// This file runs in the ServiceWorker global scope, not the DOM one the
// rest of the app's tsconfig targets — the webworker lib (self,
// ServiceWorkerGlobalScope, etc.) would collide with `dom`'s conflicting
// globals if merged project-wide, so `src/app/sw.ts` is excluded from the
// root tsconfig (tsconfig.json `exclude`) and type-checked only via this
// file-scoped triple-slash reference (editor support). It's still compiled
// (via esbuild) and served by `@serwist/turbopack`'s route handler
// (src/app/serwist/[path]/route.ts) during `next build`, so a real
// syntax/reference error here still fails the build — only the
// project-wide `tsc --noEmit` pass skips it.

/**
 * Service worker — Megs Playbook PWA shell (Sprint 10). Precaches the app
 * shell (JS/CSS/icons via the injected build manifest), serves `/api/*`
 * network-first (fresh data is the point of a live dashboard; cache is only
 * the offline safety net), and falls back to a quiet offline shell for
 * document navigations when the network is unreachable.
 *
 * Registration is opt-in, not automatic: `<SerwistProvider>`
 * (`src/components/playbook/PlaybookProviders.tsx`) registers this file
 * only when the playbook route mounts. Served from `/serwist/sw.js` with
 * `Service-Worker-Allowed: /` (set automatically by
 * `createSerwistRoute`), so the origin-wide default scope still applies —
 * nothing outside `/megs-playbook` mounts `<SerwistProvider>`, so it never
 * activates for the rest of the site.
 */

import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Outreach routes are never cached. NetworkFirst below falls back to its
// cache when the network is merely slow (8s), and a cold Vercel function plus
// a Supabase free-tier wake-up can exceed that on the first call of a
// weekly run, which hands back the previous visit's prospect list as if
// it were live. The weekly run picks who gets a follow-up from that list, so a
// stale copy is worse than a slow or failed read. Must stay ahead of
// apiNetworkFirst: Serwist uses the first matcher that hits.
const outreachNetworkOnly: RuntimeCaching = {
  matcher: ({ url }) => url.pathname.startsWith("/api/outreach/"),
  handler: new NetworkOnly(),
};

const apiNetworkFirst: RuntimeCaching = {
  matcher: ({ url }) => url.pathname.startsWith("/api/"),
  handler: new NetworkFirst({
    cacheName: "pb-api",
    networkTimeoutSeconds: 8,
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Outreach first (never cached), then the other API routes (freshness
  // matters for job polling and stats), then
  // Serwist's Next.js-tuned defaults (RSC payloads, static assets, images).
  runtimeCaching: [outreachNetworkOnly, apiNetworkFirst, ...defaultCache],
  fallbacks: {
    entries: [
      {
        url: "/megs-playbook/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
