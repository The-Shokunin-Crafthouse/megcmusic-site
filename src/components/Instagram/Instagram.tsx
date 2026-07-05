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
      {/* Soft teal blobs behind the frame, left + right (comp 39:149/150/152). */}
      <div className={styles.decor} aria-hidden="true">
        <span className={styles.blobLeft} />
        <span className={styles.blobRight} />
        <span className={styles.blobRightSm} />
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
