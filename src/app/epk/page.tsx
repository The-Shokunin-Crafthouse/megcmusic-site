import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr/ArrowUpRight";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { SectionLabel } from "@/components/SectionLabel/SectionLabel";
import { Discography } from "@/components/Discography/Discography";
import { EpkPressKit } from "@/components/EpkPressKit/EpkPressKit";
import { getPage } from "@/lib/api/wordpress";
import { parseDownloadableAssets, type EpkAsset } from "@/lib/epk-assets";
import { parseSetList, type SetGroup } from "@/lib/set-list";
import { SetList } from "./SetList";
import { getEpkContent } from "@/lib/epk-content";
import { BIO_PARAGRAPHS } from "@/config/bio";
import { WP_ORIGIN } from "@/lib/wp-origin";
import styles from "./epk.module.css";

// The named kit rows, facts and copy come from Meg's Press Kit page, bundled at
// build (src/lib/epk-content.ts) — her save triggers a rebuild. This revalidate
// governs the two per-request WP reads below (auto-discovered downloads and the
// set list), which fall back to the browser when the runtime can't reach WP.
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const epk = await getEpkContent();
  return { title: epk.metaTitle, description: epk.metaDescription };
}

// Live hi-res photo pool + press-kit source page (residential-IP links; the WP
// host serves these to visitors even when it blocks the datacenter build).
const PHOTOS_URL = `${WP_ORIGIN}/photos/`;

// Server-side parse of the press-kit page for downloadable files. A blocked
// datacenter deploy returns nothing here; EpkPressKit fills it from the browser.
async function serverAssets(): Promise<EpkAsset[]> {
  try {
    const page = await getPage("press-kit");
    return page ? parseDownloadableAssets(page.content.rendered) : [];
  } catch {
    return [];
  }
}

// Sample set list from the WP page. Blocked datacenter deploy returns nothing;
// SetList refetches from the visitor's residential IP.
async function serverSetList(): Promise<SetGroup[]> {
  try {
    const page = await getPage("sample-set-list");
    return page ? parseSetList(page.content.rendered) : [];
  } catch {
    return [];
  }
}

export default async function EpkPage() {
  const [epk, assets, setList] = await Promise.all([
    getEpkContent(),
    serverAssets(),
    serverSetList(),
  ]);

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
            <h1 className={styles.title}>Electronic Press Kit</h1>
            <p className={styles.lede}>{epk.pageLede}</p>
            <Link className={styles.cta} href="/booking">
              Request a gig
              <ArrowUpRight
                className={styles.ctaArrow}
                size={18}
                weight="bold"
                aria-hidden="true"
              />
            </Link>
          </div>
        </header>

        {/* ---- Bio -------------------------------------------------------- */}
        <section className={styles.section} aria-labelledby="epk-bio">
          <div className={styles.inner}>
            <SectionLabel id="epk-bio">The Story</SectionLabel>
            <div className={styles.bioGrid}>
              <div className={styles.bioProse}>
                {BIO_PARAGRAPHS.map((para, i) => (
                  <p key={i} className={styles.bioPara}>
                    {para}
                  </p>
                ))}
                <blockquote className={styles.bioQuote}>
                  <p className={styles.bioQuoteText}>
                    “Music with country roots and cowgirl boots.”
                  </p>
                  <cite className={styles.bioQuoteAttr}>~ Meghan Clarisse</cite>
                </blockquote>
              </div>

              <dl className={styles.facts}>
                {epk.facts.map((f) => (
                  <div key={f.label} className={styles.factRow}>
                    <dt className={styles.factLabel}>{f.label}</dt>
                    <dd className={styles.factValue}>{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* ---- Press kit downloads --------------------------------------- */}
        <section className={styles.section} aria-labelledby="epk-kit">
          <div className={styles.inner}>
            <SectionLabel id="epk-kit">Press Kit</SectionLabel>
            <EpkPressKit named={epk.kitItems} serverAssets={assets} />
          </div>
        </section>

        {/* ---- Press coverage -------------------------------------------- */}
        <section className={styles.section} aria-labelledby="epk-press">
          <div className={styles.inner}>
            <SectionLabel id="epk-press">What People Are Saying</SectionLabel>
            <ul className={styles.pressList}>
              {epk.pressItems.map((item) => (
                <li key={item.href} className={styles.pressCard}>
                  <div className={styles.pressText}>
                    <p className={styles.pressOutlet}>{item.outlet}</p>
                    <h3 className={styles.pressTitle}>
                      <a
                        className={styles.pressLink}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.title}
                        <span className={styles.srOnly}> (opens in a new tab)</span>
                      </a>
                    </h3>
                  </div>
                  <ArrowUpRight
                    className={styles.pressArrow}
                    size={22}
                    weight="bold"
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---- Music (reuse the homepage discography) -------------------- */}
        <Discography />

        {/* ---- Sample set list ------------------------------------------- */}
        <section className={styles.section} aria-labelledby="epk-setlist">
          <div className={styles.inner}>
            <SectionLabel id="epk-setlist">Sample Set List</SectionLabel>
            <p className={styles.setIntro}>{epk.setListIntro}</p>
            <SetList server={setList} />
          </div>
        </section>

        {/* ---- Resources + booking CTA ----------------------------------- */}
        <section className={styles.section} aria-labelledby="epk-resources">
          <div className={styles.inner}>
            <SectionLabel id="epk-resources">Photos &amp; Booking</SectionLabel>
            <div className={styles.resources}>
              <h3 className={styles.resourcesTitle}>Everything else you need</h3>
              <p className={styles.resourcesText}>{epk.resourcesNote}</p>
              <div className={styles.resourcesActions}>
                <Link className={styles.cta} href="/booking">
                  Request a gig
                  <ArrowUpRight
                    className={styles.ctaArrow}
                    size={18}
                    weight="bold"
                    aria-hidden="true"
                  />
                </Link>
                <Link className={styles.ctaGhost} href="/media">
                  Media gallery
                  <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                </Link>
                <a
                  className={styles.ctaGhost}
                  href={PHOTOS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Hi-res photos
                  <ArrowSquareOut size={16} weight="bold" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
