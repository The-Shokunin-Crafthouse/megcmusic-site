import type { Metadata } from "next";
import playbook from "@/data/playbook.json";
import styles from "./playbook.module.css";

// Fully static, build-time-only page: no fetch, no revalidate. Every future
// edit is a JSON-only change to src/data/playbook.json — this component maps
// over its arrays and must never hardcode a rule id, title, or count.

// The privacy mechanism for this route: it is never linked from nav or any
// other page, and this metadata block asks every crawler not to index it or
// follow its links, so it is reachable only by typing the exact URL.
export const metadata: Metadata = {
  title: "Social Playbook — MegCMusic",
  description:
    "Internal social-media algorithm playbook for Meghan Clarisse Cave. Not linked from site navigation.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

type Source = { title: string; url: string; date: string | null };

// `confidence` is typed as `string`, not a union, because the value comes
// from an unvalidated JSON file that future automated runs edit directly —
// the schema promises exactly "high" | "medium" | "low" but nothing in the
// pipeline enforces it at the data layer. CONFIDENCE_COLOR below is looked
// up defensively so an unrecognized value degrades gracefully instead of
// breaking the type check or the render.
type Rule = {
  id: string;
  title: string;
  rule: string;
  evidence: string;
  confidence: string;
  sources: Source[];
  lastVerified: string;
};

// Confidence → badge color token, as a lookup object rather than an
// if/else chain so a fourth confidence value would only need a new entry
// here, not a branch anywhere else. Values are the "light"/stronger variant
// of each token family — see the contrast note next to the badge markup.
const CONFIDENCE_COLOR: Record<"high" | "medium" | "low", string> = {
  high: "var(--mc-teal-light)",
  medium: "var(--mc-accent-gold)",
  low: "var(--mc-accent-red-ink)",
};

const FALLBACK_CONFIDENCE_COLOR = "var(--mc-text-subtle)";

function confidenceColor(confidence: string): string {
  return confidence in CONFIDENCE_COLOR
    ? CONFIDENCE_COLOR[confidence as "high" | "medium" | "low"]
    : FALLBACK_CONFIDENCE_COLOR;
}

function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ul className={styles.sourceList}>
      {sources.map((source) => (
        <li key={source.url} className={styles.sourceItem}>
          <a
            className={styles.sourceLink}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {source.title}
          </a>
          {source.date ? (
            <span className={styles.sourceDate}> — {source.date}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function RuleBlock({ rule }: { rule: Rule }) {
  return (
    <li className={styles.rule}>
      <p className={styles.ruleId}>{rule.id}</p>
      <h3 className={styles.ruleTitle}>{rule.title}</h3>
      <p className={styles.ruleText}>{rule.rule}</p>
      <p className={styles.ruleEvidence}>{rule.evidence}</p>
      <div className={styles.ruleMeta}>
        <span
          className={styles.badge}
          style={{ color: confidenceColor(rule.confidence) }}
        >
          {rule.confidence}
        </span>
        <span className={styles.lastVerified}>
          Last verified {rule.lastVerified}
        </span>
      </div>
      <SourceList sources={rule.sources} />
    </li>
  );
}

function RuleSection({
  platform,
  rules,
}: {
  platform: string;
  rules: Rule[];
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{platform}</h2>
      <ol className={styles.ruleList}>
        {rules.map((rule) => (
          <RuleBlock key={rule.id} rule={rule} />
        ))}
      </ol>
    </section>
  );
}

export default function PlaybookPage() {
  const { meta, profileScan, platforms, divergences, postingWindows } =
    playbook;

  // Changelog order is not guaranteed by the data contract — sort defensively,
  // newest date first, on every render rather than trusting array order.
  const changelogByDate = [...playbook.changelog].sort((a, b) =>
    b.date.localeCompare(a.date),
  );

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <p className={styles.stars} aria-hidden="true">
              ★ ★ ★
            </p>
            <h1 className={styles.title}>Social Playbook</h1>
            <p className={styles.lede}>
              {meta.subject}. Last full research run: {meta.lastFullRun}.
              Updates weekly as accounts and platform behavior change.
            </p>
          </div>
        </header>

        <section className={styles.scanStrip}>
          <p className={styles.scanNote}>
            <strong className={styles.scanLabel}>Instagram —</strong>{" "}
            {profileScan.instagram.notes}
          </p>
          <p className={styles.scanNote}>
            <strong className={styles.scanLabel}>Facebook —</strong>{" "}
            {profileScan.facebook.notes}
          </p>
          <p className={styles.scanNote}>
            <strong className={styles.scanLabel}>Scan limitations —</strong>{" "}
            {profileScan.scanLimitations}
          </p>
        </section>

        <RuleSection platform="Instagram" rules={platforms.instagram.rules} />
        <RuleSection platform="Facebook" rules={platforms.facebook.rules} />

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Divergences</h2>
          <div className={styles.divergenceList}>
            {divergences.map((divergence) => (
              <div key={divergence.topic} className={styles.divergenceRow}>
                <h3 className={styles.divergenceTopic}>{divergence.topic}</h3>
                <p className={styles.divergenceText}>
                  <strong className={styles.divergenceLabel}>
                    Instagram —
                  </strong>{" "}
                  {divergence.instagram}
                </p>
                <p className={styles.divergenceText}>
                  <strong className={styles.divergenceLabel}>
                    Facebook —
                  </strong>{" "}
                  {divergence.facebook}
                </p>
                <p className={styles.divergenceRecommendation}>
                  {divergence.recommendation}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Posting windows</h2>
          <p className={styles.windowMeta}>{postingWindows.timezone}</p>
          <p className={styles.windowText}>
            <strong className={styles.divergenceLabel}>Instagram —</strong>{" "}
            {postingWindows.instagram}
          </p>
          <p className={styles.windowText}>
            <strong className={styles.divergenceLabel}>Facebook —</strong>{" "}
            {postingWindows.facebook}
          </p>
          <SourceList sources={postingWindows.sources} />
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Insights log</h2>
          <div className={styles.ledger}>
            {changelogByDate.map((entry) => (
              <div key={entry.date} className={styles.ledgerEntry}>
                <p className={styles.ledgerDate}>{entry.date}</p>
                <ul className={styles.ledgerItems}>
                  {entry.entries.map((item, index) => (
                    <li
                      key={`${entry.date}-${index}`}
                      className={styles.ledgerItem}
                    >
                      <span className={styles.ledgerType}>{item.type}</span>
                      {" — "}
                      {item.summary}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            Internal — not linked from site navigation. Do not share this URL.
          </p>
        </footer>
      </main>
    </div>
  );
}
