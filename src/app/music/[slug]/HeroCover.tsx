"use client";

import { useReleaseCover } from "@/lib/use-release-cover";
import styles from "./release.module.css";

/**
 * The large cover on a release detail page. Same WP resolver as the discography
 * row (page Featured Image → product image), sized for the hero; the titled
 * placeholder reserves the square so the swap-in causes no layout shift.
 */
export function HeroCover({
  title,
  pageSlug,
  productSlug,
}: {
  title: string;
  pageSlug?: string;
  productSlug?: string;
}) {
  const url = useReleaseCover(null, pageSlug, productSlug);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.coverArt}
        src={url}
        alt={`${title} cover art`}
        decoding="async"
      />
    );
  }

  return (
    <span className={styles.coverPlaceholder} aria-hidden="true">
      <span className={styles.coverStar}>★</span>
      <span className={styles.coverTitle}>{title}</span>
    </span>
  );
}
