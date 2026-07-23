"use client";

/**
 * The guitar pick, shared by the bottom-left corner mark and the
 * creation-flow take-over's ground.
 *
 * These are not two designs that happen to rhyme — the comp's take-over
 * background (`155:1146`) is the corner mark (`155:38`) scaled by
 * 1/0.0942873 about a point 49.7px in from the left and 66.7px below the
 * frame bottom, and that one origin reproduces the pick box, the pick
 * glyph and both offsets exactly. So this renders the take-over geometry
 * once and lets `--pb-pick-scale` place it: at `--pb-pick-corner-scale`
 * it is the corner wedge, at 1 it is the whole screen, and animating
 * between the two IS the "pick fills the screen" transition rather than a
 * separate effect imitating it.
 *
 * The grain is a CSS layer, not the SVG's own filter, so it can hold a
 * constant on-screen size across that ~10.6x growth — see the module CSS.
 * The lightbulb is not here at all: it never scales, and owns its own
 * press-fill / fade-on-release (see `BottomNav`).
 */

import styles from "./PickLockup.module.css";

interface PickLockupProps {
  /** Adds the corner instance's stacking + safe-area offset, and pins it
   *  to the corner scale. Otherwise the scale is inherited, so a parent
   *  can animate it. */
  corner?: boolean;
  className?: string;
}

export function PickLockup({ corner = false, className }: PickLockupProps) {
  return (
    <div
      className={[styles.layer, corner ? styles.corner : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <div className={styles.inner}>
        <span className={styles.pick}>
          <img className={styles.pickGlyph} src="/images/playbook/pick-mark.svg" alt="" />
          <span className={styles.grain} />
        </span>
      </div>
    </div>
  );
}
