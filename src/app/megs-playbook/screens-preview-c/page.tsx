import type { Metadata } from "next";
import { ScreensPreviewCClient } from "./ScreensPreviewCClient";

// P4-C's own throwaway verification route: mounts the shell (placeholder
// panels — screens/* is P4-A/P4-B's ownership) plus the real CreationFlow,
// with buttons that exercise every store entry point directly (unseeded
// start, seeded start, and a jump-straight-to-all-six-question-types
// fixture) so the flow is checkable without depending on the live
// generation daemon. Deleted before PR.
export const metadata: Metadata = {
  title: "Screens preview C — Megs Playbook",
  robots: { index: false, follow: false },
};

export default function ScreensPreviewCPage() {
  return <ScreensPreviewCClient />;
}
