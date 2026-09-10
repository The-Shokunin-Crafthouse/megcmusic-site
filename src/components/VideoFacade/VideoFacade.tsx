"use client";

import { useState } from "react";
import { PlayCircle } from "@phosphor-icons/react/dist/ssr/PlayCircle";
import styles from "./VideoFacade.module.css";

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embed = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

/**
 * YouTube facade (extracted from VideosGallery, Sprint 13 Phase 3): a 16:9
 * box holding the thumbnail and a play button until played, then one
 * `youtube-nocookie` iframe. Controlled when `playing`/`onPlay` are given
 * (the gallery swaps the active video from its playlist); otherwise it keeps
 * its own state (Meg's `video` Home block).
 */
export function VideoFacade({
  id,
  title,
  playing,
  onPlay,
  className,
}: {
  id: string;
  title: string;
  playing?: boolean;
  onPlay?: () => void;
  className?: string;
}) {
  const [own, setOwn] = useState(false);
  const isPlaying = playing ?? own;
  const play = onPlay ?? (() => setOwn(true));
  return (
    <div className={className ? `${styles.featured} ${className}` : styles.featured}>
      {isPlaying ? (
        <iframe
          className={styles.frame}
          src={embed(id)}
          title={title || "Meghan Clarisse video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className={styles.facade}
          onClick={play}
          aria-label={`Play ${title || "featured video"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.facadeImg}
            src={thumb(id)}
            alt=""
            loading="lazy"
            decoding="async"
          />
          <PlayCircle className={styles.play} weight="fill" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
