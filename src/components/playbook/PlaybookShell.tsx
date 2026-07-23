"use client";

/**
 * The Megs Playbook PWA shell (Sprint 10 P3). Owns tab switching
 * (`TabSwitch` + the store's `activeTab`) and the bottom nav; renders
 * whatever screen content it's given per tab via the `panels` prop.
 *
 * P4 imports this and passes the four real screens:
 *
 *   <PlaybookShell panels={{ home: <Home />, stats: <Stats />,
 *     booking: <Booking />, checklist: <Checklist /> }} />
 *
 * With no `panels` prop it renders named placeholder panels (this
 * deliverable's "ShellDemo wiring") so the shell is runnable stand-alone —
 * see `src/app/megs-playbook/shell-preview/page.tsx`.
 *
 * The creation-flow take-over (idea -> questions -> generating ->
 * storyboard, via `TakeoverModal` + `StackNavigator`) is a P4 concern: it
 * portals to `document.body` independently of this component's tree, so
 * P4 can mount it anywhere reading `usePlaybookStore().creationPhase`.
 */

import type { ReactNode } from "react";
import { usePlaybookStore, type TabId } from "./store";
import { TabSwitch } from "./motion/TabSwitch";
import { BottomNav } from "./BottomNav";
import styles from "./PlaybookShell.module.css";

function PlaceholderPanel({ label }: { label: string }) {
  return <div className={styles.placeholder}>{label}</div>;
}

const DEFAULT_PANELS: Record<TabId, ReactNode> = {
  home: <PlaceholderPanel label="Home" />,
  stats: <PlaceholderPanel label="Stats" />,
  booking: <PlaceholderPanel label="Booking" />,
  checklist: <PlaceholderPanel label="Checklist" />,
};

export interface PlaybookShellProps {
  /** Screen content per tab, keyed by tab id. Defaults to named
   *  placeholder panels. */
  panels?: Record<TabId, ReactNode>;
}

export function PlaybookShell({ panels = DEFAULT_PANELS }: PlaybookShellProps) {
  const activeTab = usePlaybookStore((state) => state.activeTab);
  const setActiveTab = usePlaybookStore((state) => state.setActiveTab);

  return (
    <div className={styles.wrap}>
      <TabSwitch activeKey={activeTab}>{panels[activeTab]}</TabSwitch>
      <BottomNav activeTab={activeTab} onNavigate={setActiveTab} />
    </div>
  );
}
