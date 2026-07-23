"use client";

/**
 * A post's thumbnail, with the dead-URL case handled.
 *
 * Meta's CDN thumbnail URLs are signed and expire, and the daily sync only
 * refreshes them for the current top-5 scorable posts (2026-07-11 ADR: a
 * full-history re-walk blew the 300s cron budget). So every post below that
 * cut eventually holds a URL that 403s — a normal, expected state here, not
 * an error. Rendering a bare `<img>` at that point gives the browser's
 * broken-image glyph; this falls back to the same neutral disc the
 * no-thumbnail branch already draws, so a stale URL is indistinguishable
 * from never having had one.
 *
 * `key={src}` resets the failed state when the row is handed a fresh URL
 * after a sync, rather than latching the placeholder for the session.
 */

import { useState } from "react";

interface PostThumbnailProps {
  src: string | null | undefined;
  /** The consumer's own avatar class — sizing and shape stay with the
   *  screen that owns the layout. */
  className: string;
}

export function PostThumbnail({ src, className }: PostThumbnailProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <div className={className} aria-hidden="true" />;
  }

  return (
    <img
      key={src}
      className={className}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
