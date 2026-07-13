"use client";

import { useEffect, useRef, useState } from "react";
import { resolveReleaseCover } from "@/lib/discography-covers";
import styles from "./Discography.module.css";

/**
 * A release's cover art. Renders the titled placeholder (which reserves the exact
 * art box, so the swap-in causes no layout shift), then resolves the real cover
 * from WP on the client — the datacenter build can't read WP, so covers arrive a
 * beat after load. A hard-pinned `art` string skips the fetch entirely.
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
  const [url, setUrl] = useState<string | null>(art);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || art || (!pageSlug && !productSlug)) return;
    ran.current = true;
    let alive = true;
    resolveReleaseCover(pageSlug, productSlug).then((resolved) => {
      if (alive && resolved) setUrl(resolved);
    });
    return () => {
      alive = false;
    };
  }, [art, pageSlug, productSlug]);

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
