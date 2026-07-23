"use client";

/**
 * Bottom-right glass icon cluster (Stats/Booking/Checklist) + bottom-left
 * brand-mark Home target — spec §"Nav icon semantics" + §"Global structural
 * notes". Home has no slot in the 3-icon cluster; the pick+lightbulb mark
 * is its own tap target (confirmed by all three cluster icons rendering
 * outline/unselected on the Home screen in the comp).
 *
 * `fediverse-logo` has no Phosphor equivalent. It ships as the glyph
 * exported from the comp (`public/images/playbook/fediverse-logo.svg`,
 * masked so it takes currentColor like its Phosphor siblings) rather than
 * the `Sparkle` stand-in specs.md §62 picked when the export wasn't in
 * hand — a different glyph is a visible mismatch against the comp.
 *
 * Active tab = filled icon (`weight="fill"`) in `--pb-nav-icon-active`;
 * inactive = regular in `--pb-nav-icon-inactive`. 44x44 minimum touch
 * targets via hit-slop beyond the 40px visual circle.
 */

import { Lightbulb, Lightning, ListChecks } from "@phosphor-icons/react";
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
  Icon?: typeof Lightning;
}[] = [
  { tab: "stats", label: "Stats", Icon: Lightning },
  { tab: "booking", label: "Booking" },
  { tab: "checklist", label: "Checklist", Icon: ListChecks },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  return (
    <>
      <TapScale
        as="div"
        className={styles.homeMarkButton}
        onClick={() => onNavigate("home")}
        ariaLabel="Home"
        ariaCurrent={activeTab === "home" ? "page" : undefined}
      >
        <span className={styles.pickBleed} aria-hidden="true">
          <img
            className={styles.pickSvg}
            src="/images/playbook/pick-mark.svg"
            alt=""
            width={172}
            height={172}
          />
        </span>
        <Lightbulb
          className={styles.lightbulb}
          weight={activeTab === "home" ? "fill" : "regular"}
          aria-hidden="true"
        />
      </TapScale>

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
              {Icon ? (
                <Icon weight={isActive ? "fill" : "regular"} aria-hidden="true" />
              ) : (
                <span className={styles.maskIcon} aria-hidden="true" />
              )}
            </TapScale>
          );
        })}
      </nav>
    </>
  );
}
