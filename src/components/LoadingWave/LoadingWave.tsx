import type { CSSProperties } from "react";
import styles from "./LoadingWave.module.css";

/** Branded shop loader (2026-07-09 ADR). An audio-waveform silhouette whose
 *  bars carry a sine height envelope (tallest at centre) with a pulse that
 *  travels left-to-right — the moving equivalent of the site "moving the way
 *  her music does". Presentational and stateless: the graphic is aria-hidden;
 *  the call site owns role="status" and the visible/announced loading copy.
 *  Every colour, size, and duration is a --mc-wave-* token (token-map.css);
 *  reduced motion swaps the traveling pulse for a static silhouette breathing
 *  its opacity (LoadingWave.module.css). */

// Kept in lockstep with --mc-wave-bars in token-map.css.
const BAR_COUNT = 24;

// Sine envelope, 0 at the edges → 1 at the centre. CSS resolves the unitless
// scale against --mc-wave-h-min/max, so the pixel heights stay in the tokens.
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => ({
  scale: Math.sin((i / (BAR_COUNT - 1)) * Math.PI),
  index: i,
}));

export function LoadingWave() {
  return (
    <span className={styles.wave} aria-hidden="true">
      {BARS.map((b) => (
        <span
          key={b.index}
          className={styles.bar}
          style={
            {
              "--wave-scale": b.scale.toFixed(3),
              "--wave-i": b.index,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
