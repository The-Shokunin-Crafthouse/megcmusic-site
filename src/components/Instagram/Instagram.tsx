import { InstagramLogo } from "@phosphor-icons/react/dist/ssr/InstagramLogo";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import {
  BEHOLD_FEED_ID,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  parseBeholdPosts,
  type BeholdPost,
} from "@/config/social";
import styles from "./Instagram.module.css";

// Guitar-pick silhouette (Figma vector 39:24), reused as decoration.
const PICK_PATH =
  "M49.72 2.12833H49.6253C49.3574 2.0652 48.4901 1.84451 47.15 1.58431L47.1503 1.58457C41.9714 0.567386 36.7085 0.0369192 31.4314 0C26.1542 0.0343861 20.8917 0.562236 15.7125 1.57662C14.3725 1.83682 13.5051 2.05751 13.2372 2.12063H13.1425H13.1428C8.7729 3.43527 5.04485 6.32187 2.67795 10.2231C0.310987 14.1247 -0.527381 18.7645 0.324848 23.2473C0.324848 23.3892 0.372065 23.5232 0.403627 23.6495C5.81143 51.4689 24.652 67.9052 25.9133 68.9221L25.9765 68.9773C27.4833 70.3181 29.4302 71.0589 31.4471 71.0589C33.4644 71.0589 35.4113 70.3181 36.9181 68.9773L36.9812 68.9221C38.2109 67.9052 57.0516 51.4689 62.4594 23.6495C62.4594 23.5232 62.5146 23.3892 62.5382 23.2473C63.3881 18.7656 62.5487 14.1279 60.182 10.2284C57.8153 6.32896 54.0885 3.44368 49.7204 2.12852L49.72 2.12833Z";

// Instagram strip (Figma 39:147). Recent posts via Behold's public feed JSON
// (behold.so — not the WP host, so not datacenter-blocked). Until the account is
// connected (BEHOLD_FEED_ID unset), it renders an intentional follow state — no
// broken grid — and lights up when the id is set.
async function getPosts(): Promise<BeholdPost[]> {
  if (!BEHOLD_FEED_ID) return [];
  try {
    const res = await fetch(`https://feeds.behold.so/${BEHOLD_FEED_ID}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    return parseBeholdPosts(await res.json()).slice(0, 6);
  } catch {
    return [];
  }
}

export async function Instagram() {
  const posts = await getPosts();

  return (
    <section className={styles.section} aria-labelledby="insta-heading">
      {/* Decorative shapes behind the feed (comp 39:149/150/152) — a teal oval
          and two guitar picks, flat (no glow). */}
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.oval} />
        <svg className={styles.pickLeft} viewBox="0 0 62.8615 71.0589" fill="none">
          <path d={PICK_PATH} fill="currentColor" />
        </svg>
        <svg className={styles.pickRight} viewBox="0 0 62.8615 71.0589" fill="none">
          <path d={PICK_PATH} fill="currentColor" />
        </svg>
      </div>
      <div className={styles.inner}>
        <SectionLabel id="insta-heading">Instastar</SectionLabel>

        <div className={styles.frame}>
          {posts.length > 0 ? (
            <ul className={styles.grid}>
              {posts.map((p) => (
                <li key={p.id} className={styles.cell}>
                  <a
                    className={styles.post}
                    href={p.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbUrl} alt={p.alt} loading="lazy" decoding="async" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <a
              className={styles.follow}
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramLogo className={styles.igIcon} weight="duotone" aria-hidden="true" />
              <span className={styles.followLead}>New reels &amp; photos land here</span>
              <span className={styles.followHandle}>@{INSTAGRAM_HANDLE}</span>
            </a>
          )}
        </div>

        <p className={styles.caption}>
          Follow along between shows —{" "}
          <a
            className={styles.handle}
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            @{INSTAGRAM_HANDLE}
          </a>
        </p>
      </div>
    </section>
  );
}
