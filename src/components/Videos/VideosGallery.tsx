"use client";

import { useState } from "react";
import { PlayCircle } from "@phosphor-icons/react/dist/ssr/PlayCircle";
import type { Video } from "@/lib/api/youtube";
import styles from "./Videos.module.css";

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embed = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

// Featured player + playlist. The featured tile is a facade until played;
// picking a playlist item swaps it in and plays. One iframe at most.
export function VideosGallery({ videos }: { videos: Video[] }) {
  const [activeId, setActiveId] = useState(videos[0].id);
  const [playing, setPlaying] = useState(false);

  const active = videos.find((v) => v.id === activeId) ?? videos[0];
  const rest = videos.filter((v) => v.id !== activeId).slice(0, 4);

  function select(id: string) {
    setActiveId(id);
    setPlaying(true);
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.featured}>
        {playing ? (
          <iframe
            className={styles.frame}
            src={embed(active.id)}
            title={active.title || "Meghan Clarisse video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className={styles.facade}
            onClick={() => setPlaying(true)}
            aria-label={`Play ${active.title || "featured video"}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className={styles.facadeImg}
              src={thumb(active.id)}
              alt=""
              loading="lazy"
              decoding="async"
            />
            <PlayCircle className={styles.play} weight="fill" aria-hidden="true" />
          </button>
        )}
      </div>

      <ul className={styles.playlist} aria-label="More videos">
        {rest.map((v) => (
          <li key={v.id}>
            <button type="button" className={styles.item} onClick={() => select(v.id)}>
              <span className={styles.itemThumb}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumb(v.id)} alt="" loading="lazy" decoding="async" />
                <PlayCircle className={styles.itemPlay} weight="fill" aria-hidden="true" />
              </span>
              <span className={styles.itemText}>
                <span className={styles.itemTitle}>{v.title || "Watch on YouTube"}</span>
                {v.author && <span className={styles.itemSub}>{v.author}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
