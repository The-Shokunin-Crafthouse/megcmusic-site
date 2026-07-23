import type { Metadata } from "next";
import { PlaybookApp } from "@/components/playbook/PlaybookApp";

// Sprint 10 redesign: the static playbook document + tab bar this route
// used to render is replaced wholesale by the mobile-first PWA shell
// (stages/03-build/sprint-10-playbook-redesign/CONTEXT.md). The rules
// document's data lives on in src/data/playbook.json — the Checklist
// screen's Instagram/Facebook tabs render its action/insight layer.
//
// The privacy mechanism is unchanged: never linked from nav or any page,
// noindex/nofollow via metadata, reachable only by typing the URL.
export const metadata: Metadata = {
  title: "Megs Playbook",
  description:
    "Meghan's private social-media co-pilot. Not linked from site navigation.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function MegsPlaybookPage() {
  return <PlaybookApp />;
}
