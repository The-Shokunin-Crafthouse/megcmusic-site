/**
 * Serves the Megs Playbook service worker under Turbopack. `@serwist/next`
 * (the webpack-injecting variant) can't run here — Next 16's default
 * Turbopack build refuses a `webpack` config with no matching `turbopack`
 * config — so `@serwist/turbopack` compiles `src/app/sw.ts` via esbuild and
 * serves it (plus any related generated assets) through this dynamic route
 * instead of writing a static `public/sw.js`. Registered from
 * `PlaybookProviders.tsx` via `<SerwistProvider swUrl="/serwist/sw.js">`.
 *
 * The offline fallback page (`/megs-playbook/offline`) is precached
 * explicitly here (`additionalPrecacheEntries`) — sw.ts's own
 * `fallbacks.entries` only *references* that URL; without also precaching
 * its response the fallback itself would be unreachable while offline.
 * The revision key is the current git SHA (falling back to a random uuid
 * in an environment without git) so the entry is treated as changed
 * whenever the fallback page's content changes across a deploy.
 */

import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ||
  crypto.randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    additionalPrecacheEntries: [{ url: "/megs-playbook/offline", revision }],
    useNativeEsbuild: true,
  });
