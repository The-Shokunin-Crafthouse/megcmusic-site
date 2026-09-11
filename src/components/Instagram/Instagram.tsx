import { InstagramLogo } from "@phosphor-icons/react/dist/ssr/InstagramLogo";
import { SectionLabel } from "../SectionLabel/SectionLabel";
import {
  BEHOLD_FEED_ID,
  BEHOLD_FEED_ID_WAS_PADDED,
  parseBeholdPosts,
  type BeholdPost,
} from "@/config/social";
import { HOME_CONTENT } from "@/lib/home-content";
import styles from "./Instagram.module.css";

// Instagram strip (Figma 39:147). Recent posts via Behold's public feed JSON
// (behold.so — not the WP host, so not datacenter-blocked). With no posts it
// renders an intentional follow state — no broken grid.
//
// Every failure here renders as that same follow state, which is correct for a
// visitor and useless for anyone asking why the feed went dark: "no id set",
// "Behold answered 404", "the shape changed" and "the account has no posts" are
// four different problems wearing one face. So each one says which it is, once,
// at build (studio learning #175). The section never throws — a dead feed must
// not fail the build — but it is never silent either.
async function getPosts(): Promise<BeholdPost[]> {
  const where = "[instagram]";

  if (!BEHOLD_FEED_ID) {
    console.warn(
      `${where} no feed id: set BEHOLD_FEED_ID (or NEXT_PUBLIC_BEHOLD_FEED_ID) ` +
        `in this build's environment. Rendering the follow state.`,
    );
    return [];
  }

  try {
    const res = await fetch(`https://feeds.behold.so/${BEHOLD_FEED_ID}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // The id itself is masked in CI logs, so describe it instead: a 404 with
      // a 20-character id is a wrong or deleted feed, and a 404 with anything
      // else is a malformed one. Behold answers 404 for `<valid id>%0A` exactly
      // as it does for an id that never existed.
      console.warn(
        `${where} Behold answered ${res.status} ${res.statusText} for a feed id ` +
          `of ${BEHOLD_FEED_ID.length} characters` +
          (BEHOLD_FEED_ID_WAS_PADDED
            ? " (whitespace was trimmed off it — fix the stored value)"
            : " (no surrounding whitespace)") +
          `. Rendering the follow state.`,
      );
      return [];
    }

    const parsed = parseBeholdPosts(await res.json());
    if (parsed.length === 0) {
      console.warn(
        `${where} Behold answered 200 for feed ${BEHOLD_FEED_ID} but no post ` +
          `survived parsing — the feed is empty, or its shape changed and ` +
          `parseBeholdPosts needs updating. Rendering the follow state.`,
      );
      return [];
    }

    // A feed entry is not a picture. Behold's image proxy answers 502 for a
    // post it can no longer render, and a tile whose image 404s or 502s is
    // worse than no tile — the visitor sees alt text in an empty box. So each
    // candidate thumbnail is checked once, here at build, and only the ones
    // that actually load are rendered.
    const checked = await Promise.all(
      parsed.map(async (post) => {
        try {
          const head = await fetch(post.thumbUrl, {
            method: "HEAD",
            next: { revalidate: 3600 },
            signal: AbortSignal.timeout(8000),
          });
          return head.ok ? post : { post, status: head.status };
        } catch {
          return { post, status: 0 };
        }
      }),
    );

    const live = checked.filter((r): r is BeholdPost => "id" in r);
    const dead = checked.length - live.length;

    if (live.length === 0) {
      console.warn(
        `${where} all ${parsed.length} thumbnails failed to load — Behold's ` +
          `image proxy is not serving this account's media. Rendering the ` +
          `follow state.`,
      );
      return [];
    }

    if (dead > 0) {
      console.warn(
        `${where} ${dead} of ${parsed.length} thumbnails failed to load and ` +
          `were dropped — Behold's image proxy is not serving them. Check the ` +
          `Instagram connection in Behold if this persists.`,
      );
    }

    console.log(
      `${where} ${parsed.length} posts from Behold, ${live.length} with a ` +
        `working thumbnail; rendering ${Math.min(live.length, 4)}.`,
    );
    return live.slice(0, 4);
  } catch (err) {
    const reason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.warn(
      `${where} could not reach https://feeds.behold.so/${BEHOLD_FEED_ID} — ` +
        `${reason}. Rendering the follow state.`,
    );
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
