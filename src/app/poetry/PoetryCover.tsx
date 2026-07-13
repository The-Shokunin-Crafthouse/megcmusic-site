"use client";

import { useReleaseCover } from "@/lib/use-release-cover";
import styles from "./poetry.module.css";

/**
 * The book cover on /poetry. Reuses the shared WP cover resolver (product image),
 * resolved client-side since the datacenter build can't read WP. A quiet titled
 * placeholder holds the frame until the cover fades in — no layout shift.
 */
export function PoetryCover({ productSlug }: { productSlug: string }) {
  const url = useReleaseCover(null, undefined, productSlug);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.coverArt}
        src={url}
        alt="Secrets From a Songbird — cover"
        decoding="async"
      />
    );
  }

  return (
    <span className={styles.coverPlaceholder} aria-hidden="true">
      <span className={styles.coverStar}>★</span>
      <span className={styles.coverName}>Secrets From a Songbird</span>
    </span>
  );
}
