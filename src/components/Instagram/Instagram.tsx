import { InstagramLogo } from "@phosphor-icons/react/dist/ssr/InstagramLogo";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import {
  BEHOLD_FEED_ID,
  parseBeholdPosts,
  type BeholdPost,
} from "@/config/social";
import { HOME_CONTENT } from "@/lib/home-content";
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
    return parseBeholdPosts(await res.json()).slice(0, 4);
  } catch {
    return [];
  }
}

export async function Instagram() {
  const posts = await getPosts();

  return (
    <section className={styles.section} aria-labelledby="insta-heading">
      <div className={styles.inner}>
        <SectionLabel id="insta-heading">Instastar</SectionLabel>

        {/* The frame carries its own decor so the shapes track its exact box
            (comp 39:149/150/152): a teal angled rounded rectangle behind it,
            plus a guitar pick poking out upper-left and lower-right. No blurs. */}
        <div className={styles.frameWrap}>
          <div className={styles.decor} aria-hidden="true">
            <span className={styles.tealRect} />
            <svg className={styles.pickLeft} viewBox="0 0 100 108" aria-hidden="true">
              <path d="M50 3 C73 3 97 19 97 45 C97 77 66 105 50 105 C34 105 3 77 3 45 C3 19 27 3 50 3 Z" />
            </svg>
            <svg className={styles.pickRight} viewBox="0 0 100 108" aria-hidden="true">
              <path d="M50 3 C73 3 97 19 97 45 C97 77 66 105 50 105 C34 105 3 77 3 45 C3 19 27 3 50 3 Z" />
            </svg>
          </div>

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
              href={HOME_CONTENT.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <InstagramLogo className={styles.igIcon} weight="duotone" aria-hidden="true" />
              <span className={styles.followLead}>New reels &amp; photos land here</span>
              <span className={styles.followHandle}>@{HOME_CONTENT.instagramHandle}</span>
            </a>
          )}
          </div>
        </div>

        <p className={styles.caption}>
          {HOME_CONTENT.instagramCaption}{" "}
          <a
            className={styles.handle}
            href={HOME_CONTENT.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            @{HOME_CONTENT.instagramHandle}
          </a>
        </p>
      </div>
    </section>
  );
}
