"use client";

/**
 * Ranked rows 1-5, whole row stretched to the IG permalink (leaves the site
 * — target _blank, per the show-card stretched-link precedent). Thumbnail
 * onError swaps to a typed placeholder tile — Meta CDN URLs are refreshed
 * daily but a same-day expiry stays graceful, never a broken-image glyph.
 */

import { useState } from "react";
import type { TopPost } from "@/lib/playbook/types";
import styles from "./Performance.module.css";

const PRODUCT_TYPE_LABEL: Record<string, string> = {
  FEED: "Feed",
  REELS: "Reel",
  STORY: "Story",
};

function formatPostedDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function Thumbnail({ url, alt }: { url: string | null; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <div className={styles.thumbPlaceholder} aria-hidden="true">
        ♪
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.thumb}
      src={url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export function TopPosts({ posts }: { posts: TopPost[] }) {
  return (
    <ol className={styles.topList}>
      {posts.map((post, index) => (
        <li key={post.id} className={styles.topRow}>
          <span className={styles.rank} aria-hidden="true">
            {index + 1}
          </span>
          <Thumbnail url={post.thumbnailUrl} alt="" />
          <div className={styles.topInfo}>
            <p className={styles.topCaption}>
              {post.caption?.split("\n")[0] || "(no caption)"}
            </p>
            <div className={styles.topMeta}>
              <span className={styles.chip}>
                {PRODUCT_TYPE_LABEL[post.productType] ?? post.productType}
              </span>
              <span className={styles.topDate}>
                {formatPostedDate(post.postedAt)}
              </span>
            </div>
          </div>
          <div className={styles.topNumbers}>
            <p className={styles.topRate}>{formatRate(post.rate)}</p>
            <p className={styles.topSupporting}>
              {post.reach.toLocaleString()} reach ·{" "}
              {post.engagement.toLocaleString()} engagement
            </p>
          </div>
          <a
            className={styles.stretchedLink}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View on Instagram: ${post.caption?.split("\n")[0] || "post"}`}
          >
            <span className={styles.srOnly}>View on Instagram</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
