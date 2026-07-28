"use client";

/**
 * Home screen (spec §Screen 1, `155:2`) — Sprint 10 P4-A. Daily Insight ->
 * Your Next Post -> Last Post (★-bracketed) -> Weekly posts -> Storyboard
 * library entry row, all inside `PlaybookShell`'s scroll content (which
 * already applies the 24px `--pb-space-content` padding — this component
 * only supplies the `--pb-space-section` gap between its own blocks).
 *
 * Resolved ambiguities (sprint contract flagged these as judgment calls):
 *
 *  - **Recommendation headline gradient stops.** The comp's white->gray
 *    `bg-clip-text` gradient (`#FFFFFF -> #999999`) has no `--pb-*` token
 *    for the gray stop (the P1 token table only carries `--pb-text-muted`
 *    at `#705f57`, a much darker value tuned for small caption text, not a
 *    30px display gradient). Per the sprint contract's own fallback
 *    ("white + `--pb-text-muted` equivalents ... note it"), the gradient
 *    is built from the literal `white` CSS keyword (not a hex code) ->
 *    `var(--pb-text-muted)` — composed entirely from the sanctioned
 *    fallback rather than a new raw hex.
 *  - **"Last Post" data source.** The sprint contract says only "first
 *    post from your posts endpoint," with no sort/range params specified.
 *    Rather than invent an unspecced "most recent" sort (the posts
 *    endpoint's contract only defines score|reach|engagement), this calls
 *    `usePosts({ range: "all", sort: "score" })` — the endpoint's own
 *    default — so "first" is well-defined: the top-scored post, same
 *    definition Stats' "All Time" chip uses.
 *  - **Weekly card's `window` field.** The endpoint returns a `window` per
 *    weekly entry, but the spec's Home type table only names two text runs
 *    per weekly card (weekday label + description). `window` isn't
 *    dropped — it's folded into the weekday label's accessible name
 *    ("Wednesday, 5–7pm") so screen-reader users get it, while the visual
 *    label stays exactly the comped "Wednesday".
 */

import { useState } from "react";
import { TapScale } from "../motion/TapScale";
import { Staggered } from "../motion/Staggered";
import { usePlaybookStore } from "../store";
import { Card } from "./shared/Card";
import { StarDivider } from "./shared/StarDivider";
import { PostThumbnail } from "./shared/PostThumbnail";
import { StatTriple, type StatTripleItem } from "./shared/StatTriple";
import { TipCard } from "./shared/TipCard";
import { ExpandableTrigger, ExpandableRegion, useExpandableState } from "./shared/Expandable";
import { Skeleton } from "./shared/Skeleton";
import {
  useRecommendation,
  useTip,
  useWhyThisWorksTips,
  usePosts,
} from "../usePlaybookData";
import styles from "./HomeScreen.module.css";

export interface HomeScreenProps {
  /** Opens the storyboard library (P4-C/P5 owns that screen) — a no-op
   *  quiet row when unset, per the sprint contract. */
  onOpenLibrary?: () => void;
}

const TIP_FALLBACK = "Fresh tips are on their way.";

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Comp 155:25 is a single 30px run, so the recommendation's headline and
 *  detail render as one sentence rather than two differently-sized blocks.
 *  The headline is a fragment, so it gets terminal punctuation first. */
function nextPostLine({
  headline,
  detail,
}: {
  headline: string;
  detail?: string | null;
}): string {
  if (!detail) return headline;
  const lead = /[.!?…]$/.test(headline.trim()) ? headline.trim() : `${headline.trim()}.`;
  return `${lead} ${detail.trim()}`;
}

function firstLine(text: string | null): string | null {
  if (!text) return null;
  const line = text.split("\n")[0]?.trim();
  return line && line.length > 0 ? line : null;
}

export function HomeScreen({ onOpenLibrary }: HomeScreenProps) {
  const wtw = useExpandableState();
  const [wtwEverOpened, setWtwEverOpened] = useState(false);

  const dailyInsightQuery = useTip("daily_insight");
  const recommendationQuery = useRecommendation();
  const postsQuery = usePosts({ range: "all", sort: "score" });

  const recommendation = recommendationQuery.data;
  const whyTipsQuery = useWhyThisWorksTips(
    recommendation?.whyTags ?? [],
    wtwEverOpened,
  );

  const posts = postsQuery.data ?? [];
  const lastPost = posts[0] ?? null;
  const rateMedian = median(posts.map((post) => post.rate));

  const lastPostStats: StatTripleItem[] = lastPost
    ? [
        {
          value: `${Math.round(lastPost.rate * 100)}%`,
          label: "Ratio",
          trend: lastPost.rate >= rateMedian ? "up" : "down",
        },
        { value: String(lastPost.reach), label: "Reach", trend: "up" },
        // Comp 155:105 labels Home's third column "Engaged"; only the
        // Stats post card (155:543) spells out "Engagement".
        { value: String(lastPost.engagement), label: "Engaged", trend: "up" },
      ]
    : [];

  const whatWorkedQuery = useTip(
    "stat_insight",
    lastPost ? [lastPost.productType.toLowerCase()] : [],
    lastPost !== null,
  );

  function handleWtwToggle() {
    wtw.toggle();
    if (!wtwEverOpened) setWtwEverOpened(true);
  }

  function handleLetsGo() {
    usePlaybookStore.getState().startCreation(recommendation?.seedIdea);
  }

  function handleStartOwnIdea() {
    usePlaybookStore.getState().startCreation();
  }

  // Every block below is sized by data that is still in flight on first
  // paint, and the shaped skeletons stand in at a fraction of the height
  // their content lands at (Next Post: 150px placeholder, ~490px real), so
  // painting them in flow means the whole column jumps when the queries
  // resolve together — measured CLS 0.33-0.39 against a 0.1 budget, the
  // entire score from this one screen. Per studio learning #54 the boot
  // state renders OUT of flow (`.bootLayer`, absolutely positioned inside
  // the relatively-positioned `.stack`) and the real column mounts at its
  // final position: content appearing where nothing was displaces nothing,
  // so the shift is zero rather than merely smaller. Reserving heights
  // instead was rejected — the copy is variable-length, so any reserved
  // value is a guess that is wrong for most recommendations.
  const isBooting =
    dailyInsightQuery.isLoading ||
    recommendationQuery.isLoading ||
    postsQuery.isLoading;

  if (isBooting) {
    return (
      <div className={styles.stack}>
        <div className={styles.bootLayer} aria-busy="true" aria-label="Loading your playbook">
          <Skeleton height="5.5rem" />
          <Skeleton height="9.375rem" />
          <Skeleton height="9.375rem" />
          <Skeleton height="5.5rem" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stack}>
      <TipCard
        label="Daily Insight"
        body={dailyInsightQuery.data?.body}
        isLoading={dailyInsightQuery.isLoading}
        isError={dailyInsightQuery.isError}
        fallback={TIP_FALLBACK}
      />

      <section className={styles.nextPost} aria-label="Your Next Post">
        {recommendationQuery.isLoading ? (
          <Skeleton height="9.375rem" />
        ) : recommendationQuery.isError ? (
          <div className={styles.errorBlock} role="status" aria-live="polite">
            <p className={styles.errorText}>Couldn&apos;t reach the playbook.</p>
            <button
              type="button"
              className={styles.retryLink}
              onClick={() => recommendationQuery.refetch()}
            >
              Retry
            </button>
          </div>
        ) : !recommendation?.headline ? (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyText}>
              No recommendation yet today — the morning sync hasn&apos;t landed.
            </p>
            <TapScale
              as="button"
              className={styles.outlinePill}
              onClick={handleStartOwnIdea}
              ariaLabel="Start your own idea"
            >
              Start your own idea
            </TapScale>
          </div>
        ) : (
          <>
            <p className={styles.eyebrow}>Your Next Post</p>
            {/* Comp 155:25 is ONE 30px Light gradient run, not a headline
                plus a smaller body line — the recommendation's two fields
                render as one continuous sentence at that size. */}
            <h2 className={styles.headline}>{nextPostLine(recommendation)}</h2>
            <div className={styles.ctaRow}>
              <TapScale
                as="button"
                className={styles.ctaPill}
                onClick={handleLetsGo}
                ariaLabel="Let's go!"
              >
                Let&apos;s go!
              </TapScale>
              <ExpandableTrigger
                open={wtw.open}
                onToggle={handleWtwToggle}
                regionId={wtw.regionId}
                closedLabel="Why this works?"
                openLabel="Got it"
                className={styles.wtwTrigger}
              />
            </div>
            <ExpandableRegion
              id={wtw.regionId}
              open={wtw.open}
              ariaLabel="Why this works"
              className={styles.wtwRegion}
            >
              <p className={styles.wtwLabel}>Why this works:</p>
              {whyTipsQuery.isLoading ? (
                <Skeleton height="3.75rem" />
              ) : whyTipsQuery.data && whyTipsQuery.data.length > 0 ? (
                <ol className={styles.wtwList}>
                  {whyTipsQuery.data.map((tip) => (
                    <li key={tip.id} className={styles.wtwItem}>
                      {tip.body}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.wtwEmpty}>{TIP_FALLBACK}</p>
              )}
            </ExpandableRegion>
          </>
        )}
      </section>

      <section className={styles.lastPostSection} aria-label="Last Post">
        <StarDivider />
        {postsQuery.isLoading ? (
          <Skeleton height="9.375rem" />
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
        ) : !lastPost ? (
          <p className={styles.emptyText}>Stats land after your next post syncs.</p>
        ) : (
          /* Comp 155:81 wraps the whole block in its own card — the one
             card on this surface that does NOT use --pb-card-bg. Inside
             it, "Last Post" + stats + title are one 16px-gap group and
             "What worked" is a second, internally 8px-gap group. */
          <div className={styles.lastPostCard}>
            <div className={styles.lastPost}>
              {/* Comp order (spec §Screen 1): "Last Post" eyebrow first,
                  then the avatar + stat row, then the title. */}
              <p className={styles.lastPostLabel}>Last Post</p>
              <div className={styles.lastPostHeader}>
                <PostThumbnail src={lastPost.thumbnailUrl} className={styles.avatar} />
                <StatTriple items={lastPostStats} gap="tight" />
              </div>
              <p className={styles.lastPostTitle}>
                {firstLine(lastPost.caption) ?? "Untitled post"}
              </p>
            </div>
            {whatWorkedQuery.data ? (
              <div className={styles.whatWorked}>
                <p className={styles.whatWorkedLabel}>What worked:</p>
                <p className={styles.whatWorkedBody}>{whatWorkedQuery.data.body}</p>
              </div>
            ) : null}
          </div>
        )}
        <StarDivider className={styles.hiddenDivider} />
      </section>

      <section className={styles.weeklySection} aria-label="This week's posting windows">
        {recommendationQuery.isLoading ? (
          <div className={styles.weeklyStack}>
            <Skeleton height="5.5rem" />
            <Skeleton height="5.5rem" />
            <Skeleton height="5.5rem" />
          </div>
        ) : recommendation && recommendation.weekly.length > 0 ? (
          <Staggered className={styles.weeklyStack} itemClassName={styles.weeklyItem}>
            {recommendation.weekly.map((entry) => (
              <Card key={`${entry.day}-${entry.window}-${entry.headline}`}>
                <p className={styles.weekdayLabel}>
                  <span aria-hidden="true">{entry.day}</span>
                  <span className={styles.srOnly}>{`${entry.day}, ${entry.window}`}</span>
                </p>
                <p className={styles.weekdayDesc}>{entry.headline}</p>
              </Card>
            ))}
          </Staggered>
        ) : null}
      </section>

      {onOpenLibrary ? (
        <TapScale
          as="button"
          className={styles.libraryRow}
          onClick={onOpenLibrary}
          ariaLabel="Storyboard library"
        >
          Storyboard library →
        </TapScale>
      ) : null}
    </div>
  );
}
