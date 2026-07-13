"use client";

/**
 * Stats screen (spec §Screen 2, `155:213`) — Sprint 10 P4-A. Filter-chip
 * nav -> up-to-20 ranked post cards, each with a "Show Insight" expandable
 * (specs.md §9.9). Lives inside `PlaybookShell`'s scroll content, which
 * already applies the 24px `--pb-space-content` padding.
 *
 * Chip -> query mapping (sprint contract, literal): All Time =
 * range:all/sort:score; Last Week = range:week/sort:score; Reach =
 * sort:reach; Engagement = sort:engagement; Score = sort:score. The last
 * three don't name a range, so they default to "all" — which makes the
 * "Score" chip request-identical to "All Time" (same params, same list).
 * That's the comp's own 5-chip vocabulary, not a bug this screen
 * introduces; both chips stay independently selectable/highlightable.
 *
 * Resolved ambiguity: the P1 spec notes cards #5-7 show a "slightly
 * different internal layout" in the comp (title+Show Insight stacked, no
 * separate badge/date row) but explicitly flags it as "note as-is, don't
 * force uniform" rather than a required variant. Every post here always
 * carries `productType`/`postedAt` (the DB never omits them), so this
 * screen renders one consistent card layout for every rank rather than
 * inventing a content-completeness check the data can't actually fail.
 */

import { useState } from "react";
import { Staggered } from "../motion/Staggered";
import { Card } from "./shared/Card";
import { ChipRow, type Chip } from "./shared/ChipRow";
import { StatTriple, type StatTripleItem } from "./shared/StatTriple";
import { ExpandableTrigger, ExpandableRegion, useExpandableState } from "./shared/Expandable";
import { Skeleton } from "./shared/Skeleton";
import { useTip, usePosts, type PlaybookPost, type PostsRange, type PostsSort } from "../usePlaybookData";
import styles from "./StatsScreen.module.css";

const CHIPS: Chip[] = [
  { id: "all", label: "All Time" },
  { id: "week", label: "Last Week" },
  { id: "reach", label: "Reach" },
  { id: "engagement", label: "Engagement" },
  { id: "score", label: "Score" },
];

const CHIP_PARAMS: Record<string, { range: PostsRange; sort: PostsSort }> = {
  all: { range: "all", sort: "score" },
  week: { range: "week", sort: "score" },
  reach: { range: "all", sort: "reach" },
  engagement: { range: "all", sort: "engagement" },
  score: { range: "all", sort: "score" },
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function formatMultiple(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

function firstLine(text: string | null): string | null {
  if (!text) return null;
  const line = text.split("\n")[0]?.trim();
  return line && line.length > 0 ? line : null;
}

interface PostCardProps {
  post: PlaybookPost;
  rank: number;
  reachMedian: number;
  rateMedian: number;
}

function PostCard({ post, rank, reachMedian, rateMedian }: PostCardProps) {
  const insight = useExpandableState();
  const [everOpened, setEverOpened] = useState(false);
  const tipQuery = useTip(
    "stat_insight",
    [post.productType.toLowerCase()],
    everOpened,
  );

  function handleToggle() {
    insight.toggle();
    if (!everOpened) setEverOpened(true);
  }

  const stats: StatTripleItem[] = [
    {
      value: `${Math.round(post.rate * 100)}%`,
      label: "Ratio",
      trend: post.rate >= rateMedian ? "up" : "down",
    },
    { value: String(post.reach), label: "Reach", trend: "up" },
    { value: String(post.engagement), label: "Engagement", trend: "up" },
  ];

  const comparisonLine =
    reachMedian > 0
      ? `Reach ${post.reach} — about ${formatMultiple(post.reach / reachMedian)}× your recent median`
      : `Reach ${post.reach}`;

  return (
    <Card bordered={rank === 1} className={styles.postCard}>
      <span className={styles.rankWatermark} aria-hidden="true">
        {rank}
      </span>
      <div className={styles.content}>
        <div className={styles.postHeader}>
          {post.thumbnailUrl ? (
            <img className={styles.avatar} src={post.thumbnailUrl} alt="" />
          ) : (
            <div className={styles.avatar} aria-hidden="true" />
          )}
          <StatTriple items={stats} />
        </div>
        <p className={styles.postTitle}>{firstLine(post.caption) ?? "Untitled post"}</p>
        <div className={styles.metaRow}>
          <ExpandableTrigger
            open={insight.open}
            onToggle={handleToggle}
            regionId={insight.regionId}
            closedLabel="Show Insight"
            openLabel="Show Insight"
            className={styles.showInsightTrigger}
          />
          <span className={styles.badge}>{post.productType === "REELS" ? "Reel" : "Post"}</span>
          <span className={styles.date}>{formatDate(post.postedAt)}</span>
        </div>
        <ExpandableRegion
          id={insight.regionId}
          open={insight.open}
          ariaLabel="Show insight"
          className={styles.insightRegion}
        >
          <p className={styles.insightLine}>{comparisonLine}</p>
          {tipQuery.data ? <p className={styles.insightTip}>{tipQuery.data.body}</p> : null}
        </ExpandableRegion>
      </div>
    </Card>
  );
}

export function StatsScreen() {
  const [activeChip, setActiveChip] = useState("all");
  const params = CHIP_PARAMS[activeChip] ?? CHIP_PARAMS.all;
  const postsQuery = usePosts(params);

  const posts = postsQuery.data ?? [];
  const reachMedian = median(posts.map((post) => post.reach));
  const rateMedian = median(posts.map((post) => post.rate));

  return (
    <div className={styles.stack}>
      <ChipRow
        chips={CHIPS}
        activeId={activeChip}
        onChange={setActiveChip}
        ariaLabel="Sort and filter posts"
      />

      {postsQuery.isLoading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height="10.125rem" />
          ))}
        </div>
      ) : postsQuery.isError ? (
        <div className={styles.errorBlock} role="status" aria-live="polite">
          <p className={styles.errorText}>Couldn&apos;t reach the playbook.</p>
          <button
            type="button"
            className={styles.retryLink}
            onClick={() => postsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : posts.length === 0 ? (
        <p className={styles.emptyText}>
          Post stats show up here after the daily sync. Check back tomorrow morning.
        </p>
      ) : (
        <Staggered as="ul" itemClassName={styles.staggerItem} className={styles.list}>
          {posts.map((post, index) => (
            <PostCard
              key={post.id}
              post={post}
              rank={index + 1}
              reachMedian={reachMedian}
              rateMedian={rateMedian}
            />
          ))}
        </Staggered>
      )}
    </div>
  );
}
