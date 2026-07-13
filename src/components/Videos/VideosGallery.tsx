"use client";

import { useEffect, useRef, useState } from "react";
import { PlayCircle } from "@phosphor-icons/react/dist/ssr/PlayCircle";
import { YoutubeLogo } from "@phosphor-icons/react/dist/ssr/YoutubeLogo";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { channelUrl } from "@/config/videos";
import { fetchVideosSourceBrowser } from "@/lib/api/wordpress-browser";
import type { VideosSource } from "@/lib/media-videos";
import type { Video } from "@/lib/api/youtube";
import styles from "./Videos.module.css";

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embed = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;

const CACHE_KEY = "mc-videos-source";

// The WP host blocks datacenter IPs, so the server can't read Meg's Videos page
// (her curated list + the ACF featured video). We resolve it here from the
// visitor's residential IP and reconcile: her featured video becomes the main
// tile wherever this component renders, and any videos she added that aren't
// already in the server (channel + config) list get appended. Cached per session
// so navigating between pages doesn't refetch.
function readCache(): VideosSource | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as VideosSource) : null;
  } catch {
    return null;
  }
}
function writeCache(src: VideosSource): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(src));
  } catch {
    /* private mode / quota — the fetch just repeats next navigation */
  }
}

/** Meg's featured video first, then the existing list, then any videos she
 *  added that weren't already present. Existing titles are preserved. */
function reconcile(current: Video[], src: VideosSource): Video[] {
  const known = new Map(current.map((v) => [v.id, v]));
  const order: string[] = [];
  const seen = new Set<string>();
  for (const id of [src.featuredId, ...current.map((v) => v.id), ...src.ids]) {
    if (id && !seen.has(id)) {
      seen.add(id);
      order.push(id);
    }
  }
  return order.map(
    (id) => known.get(id) ?? { id, title: "", author: "" },
  );
}

// Featured player + playlist. The featured tile is a facade until played;
// picking a playlist item swaps it in and plays. One iframe at most.
export function VideosGallery({ videos: initial }: { videos: Video[] }) {
  const [videos, setVideos] = useState<Video[]>(initial);
  const [activeId, setActiveId] = useState(initial[0].id);
  const [playing, setPlaying] = useState(false);
  const ran = useRef(false);

  // Resolve Meg's live Videos page (residential IP) once and reconcile.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    let alive = true;
    (async () => {
      let src = readCache();
      if (!src) {
        src = await fetchVideosSourceBrowser();
        if (src.featuredId || src.ids.length > 0) writeCache(src);
      }
      if (!alive || (!src.featuredId && src.ids.length === 0)) return;
      setVideos((cur) => reconcile(cur, src));
      // Promote her featured pick to the main tile — but never yank a video the
      // visitor has already started playing out from under them.
      if (src.featuredId && !playing) setActiveId(src.featuredId);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = videos.find((v) => v.id === activeId) ?? videos[0];
  const rest = videos.filter((v) => v.id !== active.id).slice(0, 4);

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

      <div className={styles.rail}>
        <ul className={styles.playlist} aria-label="More videos">
          {rest.map((v) => (
            <li key={v.id} className={styles.playlistItem}>
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

        <a
          className={styles.channelLink}
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <YoutubeLogo className={styles.channelIcon} weight="fill" aria-hidden="true" />
          <span>Visit her YouTube channel</span>
          <ArrowUpRight className={styles.channelArrow} weight="bold" aria-hidden="true" />
        </a>
      </div>
    </div>
  );
}
