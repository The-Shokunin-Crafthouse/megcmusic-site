"use client";

/**
 * Bottom-right glass icon cluster + the bottom-left pick mark.
 *
 * The cluster is four circles (comp `310:85`): a small guitar-pick glyph
 * for Home, then Lightning (Stats), the fediverse logo (Booking) and
 * ListChecks (Checklist). The earlier three-icon read of `155:191` had no
 * Home target at all — `310:15` supplies the fourth, and shows it active
 * on the Home screen.
 *
 * `fediverse-logo` and the Home pick have no Phosphor equivalents, so both
 * ship as the comp's own exports under `public/images/playbook/`, masked
 * so they take `currentColor` like their Phosphor siblings.
 *
 * The bottom-left pick+lightbulb is the **idea** entry, not Home: the
 * take-over it opens is that same lockup grown to fill the screen (see
 * `PickLockup`), which is what the comp draws as the creation-flow ground.
 *
 * Active tab = filled glyph in `--pb-nav-icon-active` over the unchanged
 * purple disc; inactive = `--pb-nav-icon-inactive`. On scroll the whole
 * cluster scales to `--pb-nav-scale-scrolled` about its own centre
 * (comp `310:85` is a flat 0.7 of the resting pill).
 */

import { useState } from "react";
import { Lightbulb, Lightning, ListChecks } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import type { TabId } from "./store";
import { usePlaybookStore } from "./store";
import { TapScale } from "./motion/TapScale";
import { PickLockup } from "./PickLockup";
import { useScrolledPastTop } from "./useScrolledPastTop";
import { navScaleTransition } from "./motion/springs";
import styles from "./BottomNav.module.css";

interface BottomNavProps {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

type NavItem = {
  tab: TabId;
  label: string;
  Icon?: typeof Lightning;
  /** Masked export under public/images/playbook/, for glyphs Phosphor
   *  has no equivalent of. */
  mask?: string;
};

const NAV_ITEMS: NavItem[] = [
  { tab: "home", label: "Home", mask: styles.maskHome },
  { tab: "stats", label: "Stats", Icon: Lightning },
  { tab: "booking", label: "Booking", mask: styles.maskFediverse },
  { tab: "checklist", label: "Checklist", Icon: ListChecks },
];

export function BottomNav({ activeTab, onNavigate }: BottomNavProps) {
  const reducedMotion = useReducedMotion();
  const scrolled = useScrolledPastTop();
  const startCreation = usePlaybookStore((state) => state.startCreation);
  const creationOpen = usePlaybookStore((state) => state.creationPhase !== "idle");
  const [pressed, setPressed] = useState(false);

  return (
    <>
      <PickLockup corner />
      {/* The bulb is not part of the pick lockup: it fills under the
          finger and then fades out where it stands while the pick sweeps
          past it. Scaling it with the artwork would throw a 32px glyph
          across the whole screen. */}
      <motion.span
        className={styles.cornerBulb}
        aria-hidden="true"
        animate={{ opacity: creationOpen ? 0 : 1 }}
        transition={
          reducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.19, 1, 0.28, 1] }
        }
      >
        <Lightbulb weight={pressed ? "fill" : "regular"} />
      </motion.span>
      <TapScale
        as="div"
        className={styles.ideaButton}
        onClick={() => startCreation()}
        onPressChange={setPressed}
        ariaLabel="Start a new idea"
      >
        <span className={styles.srOnly}>Start a new idea</span>
      </TapScale>

      <motion.nav
        className={styles.pill}
        aria-label="Playbook sections"
        animate={{ scale: scrolled ? 0.7 : 1 }}
        transition={reducedMotion ? { duration: 0 } : navScaleTransition}
      >
        {NAV_ITEMS.map(({ tab, label, Icon, mask }) => {
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
                <span className={mask} aria-hidden="true" />
              )}
            </TapScale>
          );
        })}
      </motion.nav>
    </>
  );
}
