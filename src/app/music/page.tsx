import type { Metadata } from "next";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { Discography } from "@/components/Discography/Discography";
import { getPage } from "@/lib/api/wordpress";
import { paragraphsFromHtml } from "@/lib/wp-content";
import styles from "./music.module.css";

// The Music page changes only when Meg edits WordPress; refresh hourly so new
// intro copy appears without a redeploy. Same ISR window as /media and /epk.
export const revalidate = 3600;

// Meg's WordPress Music page. Two published pages are titled "Music": the
// legacy `music` (id 4346, last edited 2025-07) and `music-2` (id 5562), the
// maintained superset with the 2026 gallery. We consume the maintained one.
// (Flagged in decisions.md — Levi to confirm the canonical page / retire the
// duplicate; the menu location couldn't be read, that REST route is auth-gated.)
const MUSIC_SLUG = "music-2";

export const metadata: Metadata = {
  title: "Music — MegCMusic",
  description:
    "The music of Meghan Clarisse Cave — Americana with country roots and cowgirl boots. Stream every release or take one home.",
};

// Server-side parse of the WP Music page for genuine intro prose. That page is
// structurally a release gallery, so nearly every <p> is empty, a bare cover
// link, or a <strong> heading — keep only real sentences (several words) so
// that structural link/heading text never renders as a paragraph. Today this
// returns nothing (there is no intro copy); the day Meg writes one on the WP
// Music page, it flows straight through. A datacenter-blocked deploy returns
// nothing here too, and the page falls back to the release listing.
async function safeMusicIntro(): Promise<string[]> {
  try {
    const page = await getPage(MUSIC_SLUG);
    if (!page) return [];
    return paragraphsFromHtml(page.content.rendered).filter(
      (para) => para.split(/\s+/).length >= 6,
    );
  } catch {
    return [];
  }
}

export default async function MusicPage() {
  const intro = await safeMusicIntro();

  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src="/images/hero/meghan-hero.jpg"
        alt=""
        aria-hidden="true"
        decoding="async"
      />
      <div className={styles.scrim} aria-hidden="true" />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <p className={styles.stars} aria-hidden="true">
              ★★★
            </p>
            <h1 className={styles.title}>Music</h1>
            <p className={styles.lede}>
              Every release, in one place — stream Meghan Clarisse&apos;s records
              or take one home.
            </p>
          </div>
        </header>

        {intro.length > 0 && (
          <section className={styles.section} aria-labelledby="music-liner">
            <div className={styles.inner}>
              <SectionLabel id="music-liner">Liner Notes</SectionLabel>
              <div className={styles.prose}>
                {intro.map((para, i) => (
                  <p key={i} className={styles.para}>
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Release + track listings — the shared discography (home, /epk). */}
        <Discography />
      </main>
    </div>
  );
}
