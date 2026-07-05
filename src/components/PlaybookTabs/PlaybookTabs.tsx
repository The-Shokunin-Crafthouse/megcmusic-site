"use client";

/**
 * Client tab bar for /megs-playbook. Two panels: the existing Social Playbook
 * (passed in already server-rendered, so it stays static and its markup is
 * untouched) and the Booking Outreach tool. The active tab is mirrored to the
 * URL hash (#outreach) so Meg can bookmark straight to it; no localStorage.
 *
 * The Outreach panel mounts only once its tab is first opened (it fetches on
 * mount) and stays mounted-but-hidden afterward, so toggling tabs never
 * refetches.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Outreach } from "@/components/Outreach/Outreach";
import styles from "./PlaybookTabs.module.css";

type TabKey = "playbook" | "outreach";

const TABS: { key: TabKey; label: string; hash: string }[] = [
  { key: "playbook", label: "Social Playbook", hash: "" },
  { key: "outreach", label: "Booking Outreach", hash: "#outreach" },
];

function tabFromHash(): TabKey {
  if (typeof window === "undefined") return "playbook";
  return window.location.hash === "#outreach" ? "outreach" : "playbook";
}

export function PlaybookTabs({
  playbookPanel,
}: {
  playbookPanel: React.ReactNode;
}) {
  const [active, setActive] = useState<TabKey>("playbook");
  const [outreachMounted, setOutreachMounted] = useState(false);
  const baseId = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Sync from the hash on mount and on back/forward navigation.
  useEffect(() => {
    const apply = () => {
      const next = tabFromHash();
      setActive(next);
      if (next === "outreach") setOutreachMounted(true);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const selectTab = useCallback((key: TabKey) => {
    setActive(key);
    if (key === "outreach") setOutreachMounted(true);
    const hash = TABS.find((t) => t.key === key)?.hash ?? "";
    // replaceState keeps the URL bookmarkable without a scroll jump or a pile
    // of history entries as she toggles.
    const url = `${window.location.pathname}${window.location.search}${hash}`;
    window.history.replaceState(null, "", url);
  }, []);

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = TABS.length - 1;
    let next = index;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    selectTab(TABS[next].key);
    tabRefs.current[next]?.focus();
  };

  const tabId = (key: TabKey) => `${baseId}-tab-${key}`;
  const panelId = (key: TabKey) => `${baseId}-panel-${key}`;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.tablist}
        role="tablist"
        aria-label="Playbook sections"
      >
        {TABS.map((tab, index) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={tabId(tab.key)}
              aria-selected={isActive}
              aria-controls={panelId(tab.key)}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.tab} ${isActive ? styles.tabActive : ""}`}
              onClick={() => selectTab(tab.key)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId("playbook")}
        aria-labelledby={tabId("playbook")}
        hidden={active !== "playbook"}
        tabIndex={0}
      >
        {playbookPanel}
      </div>

      <div
        role="tabpanel"
        id={panelId("outreach")}
        aria-labelledby={tabId("outreach")}
        hidden={active !== "outreach"}
        tabIndex={0}
      >
        {outreachMounted ? <Outreach /> : null}
      </div>
    </div>
  );
}
