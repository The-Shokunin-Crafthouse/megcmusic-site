import styles from "./LoadingVeil.module.css";

export type VeilPhase = "hold" | "swell" | "fade";

/** Home boot veil — the full-screen loading screen covering first paint when
 *  the server render came back with zero shows (datacenter-blocked deploys).
 *  Figma 148:292 / 148:295: stage-lights photo washed into a lifted plum
 *  ground, the name lockup centred. Presentational only — HomeScene owns the
 *  lifecycle (min/max hold, exit hand-off into the hero entrance) and drives
 *  the phases via data-phase. Rendered in the server HTML when serverEmpty so
 *  there is no hydration flash. See decisions.md (2026-07-08, boot veil). */
export function LoadingVeil({ phase }: { phase: VeilPhase }) {
  return (
    <div className={styles.veil} data-phase={phase} role="status">
      <span className={styles.srOnly}>Loading shows…</span>
      <div className={styles.visuals} aria-hidden="true">
        {/* Base layer: the photo in luminosity blend at 10% — the plum ground
            does the colour, the photo does the light. Ships in the SSR HTML at
            high priority; note the MEASURED LCP element on veiled loads is the
            logo below, not this photo — Chrome excludes it as a low-entropy
            backdrop (learning #65: verify the real LCP element). */}
        <img
          className={styles.photo}
          src="/images/loading/stage-lights.jpg"
          alt=""
          width={1920}
          height={1280}
          fetchPriority="high"
          decoding="async"
        />
        {/* Beam breathing: the same photo in screen blend, opacity oscillating
            0 → peak — brightens only the light beams. Carries the same drift
            animation as the base copy so the two stay registered. */}
        <img
          className={styles.beams}
          src="/images/loading/stage-lights.jpg"
          alt=""
          width={1920}
          height={1280}
          decoding="async"
        />
        <div className={styles.logoBox}>
          {/* Measured LCP element on veiled loads (the photo is excluded as a
              low-entropy backdrop), so it rides at high priority too. */}
          <img
            className={styles.logo}
            src="/images/hero/logo-name.svg"
            alt=""
            width={273}
            height={273}
            fetchPriority="high"
          />
          {/* Same left-to-right brand-pink sweep as the persistent Logo.tsx
              mark (Figma highlight #FFC3CF) — masked to the same name SVG. */}
          <span className={styles.shimmer} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
