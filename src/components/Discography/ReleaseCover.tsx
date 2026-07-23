"use client";

import { useReleaseCover } from "@/lib/use-release-cover";
import styles from "./Discography.module.css";

/**
 * A release's cover art in the discography row. Renders the titled placeholder
 * (which reserves the exact art box, so the swap-in causes no layout shift),
 * then resolves the real cover from WP on the client — the datacenter build
 * can't read WP, so covers arrive a beat after load.
 */
export function ReleaseCover({
  title,
  art,
  pageSlug,
  productSlug,
}: {
  title: string;
  art: string | null;
  pageSlug?: string;
  productSlug?: string;
}) {
  const url = useReleaseCover(art, pageSlug, productSlug);

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={styles.art}
        src={url}
        alt={`${title} cover art`}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span className={styles.artPlaceholder} aria-hidden="true">
      <span className={styles.artStar}>★</span>
      <span className={styles.artTitle}>{title}</span>
    </span>
  );
}
