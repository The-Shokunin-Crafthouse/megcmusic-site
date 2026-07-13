/**
 * Motion constants for the Megs Playbook shell primitives (Sprint 10 P3).
 * Every value here is contractual — pulled directly from the P3 brief's
 * motion table, itself governed by the sc-motion-restraint philosophy
 * (Systemic Restraint — durations 120/220/450ms, springs over easing on
 * anything the user touches). No improvisation: a primitive that needs a
 * new value belongs to a different sprint's motion pass, not a silent
 * addition here.
 */

/** ease-out (studio Restraint token `--ease-entrance`) — decelerate in. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export const DURATION_MICRO = 0.12;
export const DURATION_STANDARD = 0.22;
export const DURATION_ORCHESTRATED = 0.45;

/** Instant-cut transition swapped in under `prefers-reduced-motion: reduce`
 *  — every primitive resolves to this rather than skipping the transition
 *  object entirely, so the end state is still reached deterministically. */
export const REDUCED_MOTION_TRANSITION = { duration: 0.001 } as const;

/** TabSwitch — crossfade + 8px y-shift, 220ms ease-out. */
export const tabSwitchTransition = {
  duration: DURATION_STANDARD,
  ease: EASE_OUT,
} as const;

/** StackNavigator — creation-flow push/pop (spec: stiffness 400 damping 40). */
export const stackNavigatorSpring = {
  type: "spring",
  stiffness: 400,
  damping: 40,
} as const;

/** TakeoverModal — rises from bottom (spec: stiffness 400 damping 34). */
export const takeoverModalSpring = {
  type: "spring",
  stiffness: 400,
  damping: 34,
} as const;

/** TapScale — studio-standard tap-scale spring (learning #17: stiffness
 *  400, damping 30, mass 1 — "springs, not easing"). */
export const tapScaleSpring = {
  type: "spring",
  stiffness: 400,
  damping: 30,
  mass: 1,
} as const;

/** BottomSheet — snap-based spring (spec + learning #16: stiffness 400
 *  damping 25). */
export const bottomSheetSpring = {
  type: "spring",
  stiffness: 400,
  damping: 25,
} as const;

/** Staggered — list-entrance helper, 60ms stagger between children. */
export const STAGGER_DELAY = 0.06;
