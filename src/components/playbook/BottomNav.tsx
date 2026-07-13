"use client";

/**
 * Bottom-right glass icon cluster (Stats/Booking/Checklist) + bottom-left
 * brand-mark Home target — spec §"Nav icon semantics" + §"Global structural
 * notes". Home has no slot in the 3-icon cluster; the pick+lightbulb mark
 * is its own tap target (confirmed by all three cluster icons rendering
 * outline/unselected on the Home screen in the comp).
 *
 * `fediverse-logo` has no Phosphor equivalent (spec's cross-screen
 * synthesis) — `Sparkle` is the logged stand-in for Booking's slot.
 *
 * Active tab = filled icon (`weight="fill"`); inactive = regular. 44x44
 * minimum touch targets via hit-slop beyond the 40px visual circle.
 */

import { Lightbulb, Lightning, ListChecks, Sparkle } from "@phosphor-icons/react";
import type { TabId } from "./store";
import { TapScale } from "./motion/TapScale";
import styles from "./BottomNav.module.css";

interface BottomNavProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

const NAV_ITEMS: {
  tab: Extract<TabId, "stats" | "booking" | "checklist">;
  label: string;
  Icon: typeof Lightning;
}[] = [
  { tab: "stats", label: "Stats", Icon: Lightning },
  { tab: "booking", label: "Booking", Icon: Sparkle },
  { tab: "checklist", label: "Checklist", Icon: ListChecks },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <>
      <div className={styles.homeMarkWrap}>
        <TapScale
          as="div"
          className={styles.homeMarkButton}
          onClick={() => onNavigate("home")}
          ariaLabel="Home"
          ariaCurrent={activeTab === "home" ? "page" : undefined}
        >
          <img
            className={styles.pickSvg}
            src="/images/hero/logo-pick.svg"
            alt=""
            aria-hidden="true"
            width={216}
            height={216}
          />
          <Lightbulb
            className={styles.lightbulb}
            weight={activeTab === "home" ? "fill" : "regular"}
            aria-hidden="true"
          />
        </TapScale>
      </div>

      <nav className={styles.pill} aria-label="Playbook sections">
        {NAV_ITEMS.map(({ tab, label, Icon }) => {
          const isActive = activeTab === tab;
          return (
            <TapScale
              key={tab}
              as="button"
              className={styles.iconButton}
              onClick={() => onNavigate(tab)}
              ariaLabel={label}
              ariaCurrent={isActive ? "page" : undefined}
            >
              <Icon weight={isActive ? "fill" : "regular"} aria-hidden="true" />
            </TapScale>
          );
        })}
      </nav>
    </>
  );
}
