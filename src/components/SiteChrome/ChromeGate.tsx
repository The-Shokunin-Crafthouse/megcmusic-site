"use client";

/**
 * Suppresses the global `<SiteChrome />` (logo + nav) on the `/megs-playbook`
 * PWA shell — that surface owns its own bottom nav + brand mark per the
 * Sprint 10 redesign spec, and the persistent top-corner logo/menu would
 * collide with the shell's frame-pinned content (PLAN.md "top chrome
 * hazard", LEARNINGS 2026-07-05). Server children (`<SiteChrome />`) passed
 * to a client wrapper is the intended pattern — this component only reads
 * the pathname, it does not need to own the chrome markup itself.
 */

import { usePathname } from "next/navigation";

export function ChromeGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/megs-playbook")) return null;
  return <>{children}</>;
}
