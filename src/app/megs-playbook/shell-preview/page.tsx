import type { Metadata } from "next";
import { PlaybookShell } from "@/components/playbook/PlaybookShell";

// Runnable demo of the P3 shell (deliverable #9): four placeholder tab
// panels wired through TabSwitch + BottomNav + the Zustand store. Not a
// production route — page.tsx (the real /megs-playbook entry) stays
// untouched per the sprint contract; P4 swaps that page over to
// <PlaybookShell panels={{...real screens}} /> directly rather than
// linking here. This route exists so the shell can be visually verified
// end-to-end (chrome suppression, safe-area backdrop, tab motion, nav
// a11y) before P4 starts.
export const metadata: Metadata = {
  title: "Shell preview — Megs Playbook",
  robots: { index: false, follow: false },
};

export default function ShellPreviewPage() {
  return <PlaybookShell />;
}
