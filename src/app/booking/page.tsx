import type { Metadata } from "next";
import { BookingForm } from "@/components/BookingForm/BookingForm";
import styles from "./booking.module.css";

export const metadata: Metadata = {
  title: "Booking — MegCMusic",
  description:
    "Book Meghan Clarisse Cave for your venue, festival, or private event — solo acoustic or full band across the Colorado Front Range and beyond.",
};

// What a promoter should include, so the first message is useful.
const INCLUDE = [
  "The date (or a few options) and the city",
  "Venue name and rough set length",
  "Solo acoustic or full band",
  "Anything else — budget, ticketing, a private event",
];

// Booking-at-a-glance, drawn from her bio — no invention.
const FACTS: { label: string; value: string }[] = [
  { label: "Formats", value: "Solo Acoustic · Full Band" },
  { label: "Based", value: "Front Range, Colorado" },
  { label: "Plays", value: "Bars · Venues · Festivals · Private events" },
];

export default function BookingPage() {
  return (
    <div className={styles.page}>
      <img
        className={styles.bg}
        src="images/hero/meghan-hero.jpg"
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
            <p className={styles.lede}>
              Tell Meghan about your show and she’ll get back to you directly.
              Bars, venues, festivals, and private events — solo or full band.
            </p>
          </div>
        </header>

        <div className={styles.body}>
          <div className={styles.layout}>
            <section className={styles.intro} aria-labelledby="booking-intro">
              <h2 className={styles.srOnly} id="booking-intro">
                About booking
              </h2>
              <p className={styles.introText}>
                Every show is booked personally — no agency in between. Send a
                few details and Meghan will follow up from her own inbox to work
                out the rest.
              </p>

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

            <section
              className={styles.panel}
              aria-labelledby="booking-form-title"
            >
              <h2 className={styles.panelTitle} id="booking-form-title">
                Send a booking enquiry
              </h2>
              <BookingForm />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
