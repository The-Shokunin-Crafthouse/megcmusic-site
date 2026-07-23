"use client";

/**
 * The full prospect pipeline, grouped and counted, in a fixed order:
 * Replied — positive · Replied — negative · In sequence · Cooling off · New.
 * Rows are a dense table register on desktop and stacked cards under 768. In
 * sequence shows "cycle N · follow-up X/3"; cooling shows the resume date.
 */

import type { PipelineBuckets, Prospect } from "@/lib/outreach/types";
import { categoryChip } from "./categories";
import { calendarDate, relativeTime } from "./relativeTime";
import styles from "./Outreach.module.css";

type GroupKey = keyof PipelineBuckets;

const GROUP_ORDER: { key: GroupKey; title: string }[] = [
  { key: "replied_positive", title: "Replied — positive" },
  { key: "replied_negative", title: "Replied — negative" },
  { key: "in_sequence", title: "In sequence" },
  { key: "cooling", title: "Cooling off" },
  { key: "new", title: "New" },
];

function meta(key: GroupKey, prospect: Prospect): string {
  if (key === "in_sequence") {
    return `cycle ${prospect.cycle} · follow-up ${prospect.followups_sent}/3`;
  }
  if (key === "cooling") {
    const resume = calendarDate(prospect.cooling_until);
    return resume ? `resumes ${resume}` : "cooling";
  }
  return relativeTime(prospect.last_contacted_at);
}

function ProspectRow({
  prospect,
  groupKey,
}: {
  prospect: Prospect;
  groupKey: GroupKey;
}) {
  return (
    <li className={styles.pipeRow}>
      <span className={styles.pipeOrg}>{prospect.org}</span>
      <span className={styles.pipeContact}>{prospect.contact_name ?? "—"}</span>
      <span className={styles.chip}>{categoryChip(prospect.category)}</span>
      <span className={styles.pipeCity}>{prospect.city ?? "—"}</span>
      <span className={styles.pipeMeta}>{meta(groupKey, prospect)}</span>
    </li>
  );
}

export function Pipeline({ buckets }: { buckets: PipelineBuckets }) {
  const total = GROUP_ORDER.reduce(
    (sum, g) => sum + buckets[g.key].length,
    0,
  );

  return (
    <section className={styles.section} aria-labelledby="outreach-pipeline">
      <h3 className={styles.sectionTitle} id="outreach-pipeline">
        Pipeline
      </h3>
      {total === 0 ? (
        <p className={styles.emptyLine}>
          No prospects yet — the first weekly run fills this.
        </p>
      ) : (
        <div className={styles.pipeGroups}>
          {GROUP_ORDER.map(({ key, title }) => {
            const rows = buckets[key];
            if (rows.length === 0) return null;
            return (
              <div key={key} className={styles.pipeGroup}>
                <h4 className={styles.pipeGroupTitle}>
                  {title}
                  <span className={styles.pipeCount}>{rows.length}</span>
                </h4>
                <ul className={styles.pipeList}>
                  {rows.map((prospect) => (
                    <ProspectRow
                      key={prospect.id}
                      prospect={prospect}
                      groupKey={key}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
