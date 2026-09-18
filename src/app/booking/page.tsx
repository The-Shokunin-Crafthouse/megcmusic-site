import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm/BookingForm";
import styles from "./booking.module.css";
import { heroImage } from "@/lib/hero-images";
import { BOOKING_CONTENT, BOOKING_LAYOUT } from "@/lib/booking-content";
import { PageLayout } from "@/components/Blocks/PageLayout";

// Every word outside the form comes from the Booking page in Meg's dashboard
// (WP page 5, "Booking Page" field group) — Sprint 16 Phase 2.
export const metadata: Metadata = {
  title: BOOKING_CONTENT.metaTitle,
  description: BOOKING_CONTENT.metaDescription,
};

// What a promoter should include, so the first message is useful.
const INCLUDE = BOOKING_CONTENT.includeItems;

// Booking-at-a-glance: fixed row labels, Meg's values.
const FACTS = BOOKING_CONTENT.facts;

const SECTIONS = {
  booking: () => (
    <div className={styles.body}>
      <div className={styles.layout}>
        <section className={styles.intro} aria-labelledby="booking-intro">
          <h2 className={styles.srOnly} id="booking-intro">
            About booking
          </h2>
          <p className={styles.introText}>{BOOKING_CONTENT.intro}</p>

          <div>
            <p className={styles.includeTitle}>What to include</p>
            <ul className={styles.includeList}>
              {INCLUDE.map((item) => (
                <li key={item} className={styles.includeItem}>
                  <span className={styles.includeStar} aria-hidden="true">
                    ★
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <dl className={styles.facts}>
            {FACTS.map((f) => (
              <div key={f.label} className={styles.factRow}>
                <dt className={styles.factLabel}>{f.label}</dt>
                <dd className={styles.factValue}>{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={styles.panel} aria-labelledby="booking-form-title">
          <h2 className={styles.panelTitle} id="booking-form-title">
            Send a booking enquiry
          </h2>
          <BookingForm />
        </section>
      </div>
    </div>
  ),
};

export default function BookingPage() {
  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src={heroImage("booking")}
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
            <h1 className={styles.title}>Request a Gig</h1>
            <p className={styles.lede}>{BOOKING_CONTENT.lede}</p>
          </div>
        </header>

        {/* Sprint 17: the Booking page's "Page layout" list. */}
        <PageLayout items={BOOKING_LAYOUT} render={SECTIONS} />
      </main>
    </div>
  );
}
