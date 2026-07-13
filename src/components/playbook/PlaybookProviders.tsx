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
 * requirement for the shell to work.
 */

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SerwistProvider } from "@serwist/turbopack/react";

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
    <SerwistProvider swUrl="/serwist/sw.js">
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </SerwistProvider>
  );
}
