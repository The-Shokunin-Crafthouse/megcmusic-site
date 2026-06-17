import { Nav } from "@/components/Nav/Nav";
import { Hero } from "@/components/Hero/Hero";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <Nav />
      <Hero />
    </div>
  );
}
