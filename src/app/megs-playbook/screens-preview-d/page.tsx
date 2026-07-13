import type { Metadata } from "next";
import { ScreensPreviewDClient } from "./ScreensPreviewDClient";

// P5's own throwaway verification route: mounts StoryboardResult directly
// (creation + revisit modes) against the committed storyboard/titles
// fixtures, plus FirstRun and a LibraryTakeover open toggle, so Screens
// 7/8/10 are checkable without depending on the live generation daemon or
// a seeded Supabase table. Deleted before PR — same convention as
// screens-preview-a/b/c.
export const metadata: Metadata = {
  title: "Screens preview D — Megs Playbook",
  robots: { index: false, follow: false },
};

export default function ScreensPreviewDPage() {
  return <ScreensPreviewDClient />;
}
