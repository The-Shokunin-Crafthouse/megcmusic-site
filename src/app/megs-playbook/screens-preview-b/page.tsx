import type { Metadata } from "next";
import { PlaybookShell } from "@/components/playbook/PlaybookShell";
import { BookingScreen } from "@/components/playbook/screens/BookingScreen";
import { ChecklistScreen } from "@/components/playbook/screens/ChecklistScreen";

// Throwaway P4-B verification route — mounts the real shell with Booking
// and Checklist wired in, Home/Stats left as the shell's placeholders
// (those are P4-A's screens). Deleted before PR per the sprint contract;
// do not link this from anywhere real.
export const metadata: Metadata = {
  title: "Screens preview B — Megs Playbook",
  robots: { index: false, follow: false },
};

export default function ScreensPreviewBPage() {
  return (
    <PlaybookShell
      panels={{
        home: <div />,
        stats: <div />,
        booking: <BookingScreen />,
        checklist: <ChecklistScreen />,
      }}
    />
  );
}
