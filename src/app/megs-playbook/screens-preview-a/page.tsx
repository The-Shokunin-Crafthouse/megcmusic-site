import type { Metadata } from "next";
import { PlaybookShell } from "@/components/playbook/PlaybookShell";
import { HomeScreen } from "@/components/playbook/screens/HomeScreen";
import { StatsScreen } from "@/components/playbook/screens/StatsScreen";

// P4-A's own throwaway verification route: mounts the shell with the real
// Home/Stats panels (Booking/Checklist stay the shell's placeholders — P4-B
// owns those) so this deliverable can be visually checked end-to-end before
// the orchestrator wires everything into the real page.tsx. Not shared with
// shell-preview (P3's own verification route) and deleted before PR.
export const metadata: Metadata = {
  title: "Screens preview A — Megs Playbook",
  robots: { index: false, follow: false },
};

export default function ScreensPreviewAPage() {
  return (
    <PlaybookShell
      panels={{
        home: <HomeScreen />,
        stats: <StatsScreen />,
        booking: <div>Booking (P4-B)</div>,
        checklist: <div>Checklist (P4-B)</div>,
      }}
    />
  );
}
