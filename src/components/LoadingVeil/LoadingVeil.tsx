import styles from "./LoadingVeil.module.css";

export type VeilPhase = "hold" | "swell" | "fade";

/** Beam fixtures fanning from the upper truss (left→right), pool gobos on the
 *  floor, and the lamp blooms at each fixture — all colour/placement/phase are
 *  in LoadingVeil.module.css (.b1–.b8 / .p1–.p7 / .l1–.l8 / .s1–.s2). */
const BEAMS = ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8"] as const;
const POOLS = ["p1", "p2", "p3", "p4", "p5", "p6", "p7"] as const;
const LAMPS = ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"] as const;
const SWEEPS = ["s1", "s2"] as const;

/** Home boot veil — the full-screen loading screen covering first paint when
 *  the server render came back with zero shows (datacenter-blocked deploys).
 *  A procedural concert-lighting scene (beam cones + lamp blooms + floor gobo
 *  pools) over a lifted plum ground, the name lockup centred — replaces the
 *  stage photo, whose mix-blend-mode flipped on compositing and whose beams
 *  couldn't move (2026-07-09 ADR). Presentational only — HomeScene owns the
 *  lifecycle (min/max hold, exit hand-off into the hero entrance) and drives
 *  the phases via data-phase. Rendered in the server HTML when serverEmpty so
 *  there is no hydration flash. See decisions.md (2026-07-08 / 2026-07-09). */
export function LoadingVeil({ phase }: { phase: VeilPhase }) {
  return (
    <div className={styles.veil} data-phase={phase} role="status">
      <span className={styles.srOnly}>Loading shows…</span>
      <div className={styles.visuals} aria-hidden="true">
        {/* Back-to-front: atmospheric haze → slow room-pass sweeps → fixture
            lamp blooms → beam cones → floor gobo pools → exit bloom. Pure CSS
            gradients; transform/opacity only; no blend mode, no filter. */}
        <div className={styles.haze} />
        {SWEEPS.map((s) => (
          <div key={s} className={`${styles.sweep} ${styles[s]}`} />
        ))}
        {LAMPS.map((l) => (
          <div key={l} className={`${styles.lamp} ${styles[l]}`} />
        ))}
        {BEAMS.map((b) => (
          <div key={b} className={`${styles.beam} ${styles[b]}`} />
        ))}
        {POOLS.map((p) => (
          <div key={p} className={`${styles.pool} ${styles[p]}`} />
        ))}
        {/* Progressive blur over the cones: crisp at the source, hazier toward
            the floor. Above the light layers, below the logo. */}
        <div className={styles.coneBlur} />
        <div className={styles.bloom} />
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
