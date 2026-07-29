"use client";

/**
 * Client boundary for the Megs Playbook route: mounts the TanStack Query
 * client (server-state cache for job polling / summary / pipeline reads)
 * and registers the service worker via `SerwistProvider`.
 *
 * Registration is scoped to this route on purpose — `<SerwistProvider>`
 * only mounts here, under `/megs-playbook`'s layout, so the SW never
 * registers for the rest of the (non-PWA) site. `swUrl="/serwist/sw.js"`
 * matches the route handler at `src/app/serwist/[path]/route.ts`, which
 * sets `Service-Worker-Allowed: /` so the worker still controls the whole
 * origin's default scope despite being served from a nested path. A
 * failed registration (unsupported browser, dev mode) is a silent
 * no-op — offline support is a progressive enhancement, never a hard
 * requirement for the shell to work. Making that last sentence true is
 * `<ServiceWorkerRegistrar>`'s job, below.
 */

import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SerwistProvider, useSerwist } from "@serwist/turbopack/react";

/**
 * Owns the service-worker registration promise so a failed registration
 * degrades to "no offline support" instead of taking the route down.
 *
 * `<SerwistProvider>`'s own `register` prop fires `void serwist.register()`
 * during its `useState` initializer — no rejection handler, nothing to
 * attach one to. And `@serwist/window`'s `register()` reads
 * `registration.waiting` off the result of
 * `navigator.serviceWorker.register()` with no null check. Anywhere that
 * call resolves to nothing — Playwright's `serviceWorkers: "block"`, a
 * browser with service workers disabled, a non-secure context — the read
 * throws `Cannot read properties of undefined (reading 'waiting')` as an
 * unhandled rejection at boot, which in dev surfaces as
 * `⨯ unhandledRejection` and can take the whole playbook client tree with
 * it (no BottomNav, no FirstRun).
 *
 * So registration is turned off on the provider (`register={false}`) and
 * driven from here, where the promise has an owner. Registration still
 * goes through `serwist.register()` rather than
 * `navigator.serviceWorker.register()` directly, so the update lifecycle
 * (`updatefound` → install → `skipWaiting` → `controllerchange`) stays
 * wired exactly as the library intends whenever registration *does*
 * succeed — sw.ts sets `skipWaiting: true` + `clientsClaim: true`, so an
 * update applies itself with no prompt UI to preserve.
 */
function ServiceWorkerRegistrar() {
  const { serwist } = useSerwist();
  // `serwist` is a stable per-window singleton, but the effect runs twice
  // under StrictMode; `register()` refuses a second call on the same
  // instance (dev) or double-registers (prod), so gate it here.
  const registered = useRef(false);

  useEffect(() => {
    // Null when service workers are unavailable at all (SSR, non-secure
    // context, `disable`) — nothing to register, nothing to warn about.
    if (!serwist || registered.current) return;
    registered.current = true;

    void serwist.register().catch((error: unknown) => {
      // Offline support is progressive enhancement: the shell, its data,
      // and every interaction work identically without a worker.
      if (process.env.NODE_ENV !== "production") {
        console.info(
          "[playbook] service worker not registered — continuing without offline support.",
          error,
        );
      }
    });
  }, [serwist]);

  return null;
}

export function PlaybookProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <SerwistProvider swUrl="/serwist/sw.js" register={false}>
      <ServiceWorkerRegistrar />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SerwistProvider>
  );
}
