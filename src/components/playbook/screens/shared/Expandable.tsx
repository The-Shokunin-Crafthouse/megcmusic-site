"use client";

/**
 * Accessible expand/collapse primitives for Home's "Why this works?"
 * (specs.md §9.8) and Stats' "Show Insight" (specs.md §9.9): a real
 * `<button aria-expanded aria-controls>` (never a div-as-button) whose
 * label swaps closed<->open, driving a 220ms ease-out height+fade region
 * via the grid-template-rows trick (no JS height measurement — same
 * technique as the existing `src/components/Disclosure` primitive).
 *
 * Trigger and region are separate exports (`ExpandableTrigger`/
 * `ExpandableRegion`, sharing state via `useExpandableState`) because
 * Home's layout needs them physically apart in the tree: the trigger sits
 * inline in the CTA row next to "Let's go!", but the expanded content
 * spans the full card width below that row, not squeezed into the row's
 * flex column. `Expandable` below is a convenience wrapper for the common
 * stacked case (trigger directly above its own region) — Stats' "Show
 * Insight" uses it directly.
 *
 * The tap affordance is hand-rolled here (framer-motion `whileTap` +
 * `tapScaleSpring`, the same values `TapScale` uses) rather than wrapping
 * `TapScale` itself, since `TapScale` doesn't forward `aria-expanded`/
 * `aria-controls` and this component isn't the owner of that shared
 * primitive.
 */

import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { tapScaleSpring } from "../../motion/springs";
import styles from "./Expandable.module.css";

export function useExpandableState(onOpenChange?: (open: boolean) => void) {
  const [open, setOpen] = useState(false);
  const regionId = useId();

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  }

  return { open, toggle, regionId };
}

interface ExpandableTriggerProps {
  open: boolean;
  onToggle: () => void;
  regionId: string;
  closedLabel: string;
  openLabel: string;
  className?: string;
}

export function ExpandableTrigger({
  open,
  onToggle,
  regionId,
  closedLabel,
  openLabel,
  className,
}: ExpandableTriggerProps) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.button
      type="button"
      className={className ?? styles.trigger}
      aria-expanded={open}
      aria-controls={regionId}
      onClick={onToggle}
      whileTap={reducedMotion ? undefined : { scale: 0.92 }}
      transition={tapScaleSpring}
    >
      {open ? openLabel : closedLabel}
    </motion.button>
  );
}

interface ExpandableRegionProps {
  id: string;
  open: boolean;
  ariaLabel: string;
  children: React.ReactNode;
  className?: string;
}

export function ExpandableRegion({
  id,
  open,
  ariaLabel,
  children,
  className,
}: ExpandableRegionProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label={ariaLabel}
      className={[styles.region, className].filter(Boolean).join(" ")}
      data-open={open}
    >
      <div className={styles.inner}>{children}</div>
    </div>
  );
}

interface ExpandableProps {
  closedLabel: string;
  openLabel: string;
  children: React.ReactNode;
  triggerClassName?: string;
  regionAriaLabel?: string;
  onOpenChange?: (open: boolean) => void;
}

/** Stacked convenience wrapper (trigger immediately above its own region). */
export function Expandable({
  closedLabel,
  openLabel,
  children,
  triggerClassName,
  regionAriaLabel,
  onOpenChange,
}: ExpandableProps) {
  const { open, toggle, regionId } = useExpandableState(onOpenChange);
  return (
    <div className={styles.wrap}>
      <ExpandableTrigger
        open={open}
        onToggle={toggle}
        regionId={regionId}
        closedLabel={closedLabel}
        openLabel={openLabel}
        className={triggerClassName}
      />
      <ExpandableRegion id={regionId} open={open} ariaLabel={regionAriaLabel ?? closedLabel}>
        {children}
      </ExpandableRegion>
    </div>
  );
}
