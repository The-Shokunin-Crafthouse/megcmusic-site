"use client";

import { useEffect, useRef, useState } from "react";
import { resolveReleaseCover } from "@/lib/discography-covers";

/**
 * Resolve a release's cover URL on the client (the datacenter build can't read
 * WP). Returns `art` immediately when hard-pinned, otherwise null until the
 * residential fetch resolves the page/product image. Shared by the discography
 * row cover and the release-detail hero cover so both use one resolver + cache.
 */
export function useReleaseCover(
  art: string | null,
  pageSlug?: string,
  productSlug?: string,
): string | null {
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

  return url;
}
