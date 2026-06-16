import { getPages } from "@/lib/api/wordpress";
import { getProducts } from "@/lib/api/woocommerce";
import { getEvents } from "@/lib/api/events";
import styles from "./page.module.css";

type Probe = { label: string; count: number | null };

async function probe(
  label: string,
  run: () => Promise<unknown[]>,
): Promise<Probe> {
  try {
    return { label, count: (await run()).length };
  } catch {
    return { label, count: null };
  }
}

export default async function Home() {
  const probes = await Promise.all([
    probe("WordPress pages", getPages),
    probe("WooCommerce products", getProducts),
    probe("Upcoming shows", () => getEvents("upcoming")),
  ]);

  return (
    <main className={styles.main}>
      <p className={styles.kicker}>★★★ HEADLESS SCAFFOLD ★★★</p>
      <h1 className={styles.title}>Meghan Clarisse Cave</h1>
      <p className={styles.tagline}>Colorado singer-songwriter</p>

      <ul className={styles.probes}>
        {probes.map((p) => (
          <li key={p.label} className={styles.probe}>
            <span className={styles.probeLabel}>{p.label}</span>
            <span
              className={p.count === null ? styles.probeDown : styles.probeUp}
            >
              {p.count === null ? "unreachable" : `${p.count} reachable`}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
