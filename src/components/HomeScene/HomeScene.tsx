"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { ShowsSection } from "../ShowsSection/ShowsSection";
import type { TribeEvent } from "@/lib/api/events";
import styles from "./HomeScene.module.css";

// The home scroll scene (Sprint 6, Figma 39:2). Meg's photo is a fixed backdrop
// (the LCP element — painted at first paint, no animation gating it); a plum
// scrim fades over it, then logo → nav → the dates list arrive with weight
// (entrance driven from CSS via body[data-home], so the tokenised durations and
// eases stay in CSS and run off the main thread). The dates list scrolls over
// the fixed photo; when "See all dates" nears the viewport bottom the backdrop
// detaches and scrolls away with the page. See decisions.md (2026-07-04).
export function HomeScene({
  upcoming,
  justAdded,
  past,
}: {
  upcoming: TribeEvent[];
  justAdded: TribeEvent[];
  past: TribeEvent[];
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  // Entrance: mark the body hidden before paint, reveal on the next frame so the
  // CSS transition runs. Reduced motion skips straight to the settled state.
  useLayoutEffect(() => {
    const { body } = document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      body.dataset.home = "entered";
      return () => {
        delete body.dataset.home;
      };
    }
    body.dataset.home = "pending";
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        body.dataset.home = "entered";
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      delete body.dataset.home;
    };
  }, []);

  // Release: once the end-of-scene marker passes the release line — 48px
  // (--mc-space-6) above the viewport bottom — the fixed photo translates up at
  // scroll speed, so it detaches and scrolls away with the page. Kept `fixed`
  // (not `absolute`) so it never adds to the scroll height. Reduced motion never
  // pins it (the backdrop lays out statically in CSS), so the trigger is skipped.
  useEffect(() => {
    const backdrop = backdropRef.current;
    const marker = markerRef.current;
    if (!backdrop || !marker) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let killed = false;
    let cleanup = () => {};

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (killed) return;
      gsap.registerPlugin(ScrollTrigger);

      const gap =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue("--mc-space-6"),
          10,
        ) || 48;

      // Promote the layer only while it's actually translating; at rest the
      // backdrop stays a plain fixed element so it paints full-bleed at first
      // paint (a static will-change made it snap to full-bleed only on scroll).
      const apply = () => {
        const past = window.innerHeight - gap - marker.getBoundingClientRect().top;
        const shift = Math.max(0, past);
        if (shift) {
          backdrop.style.willChange = "transform";
          backdrop.style.transform = `translate3d(0, ${-shift}px, 0)`;
        } else {
          backdrop.style.transform = "";
          backdrop.style.willChange = "";
        }
      };

      const st = ScrollTrigger.create({
        trigger: marker,
        start: `top bottom-=${gap}`,
        end: "top top",
        onUpdate: apply,
        onLeave: apply,
        onLeaveBack: () => {
          backdrop.style.transform = "";
          backdrop.style.willChange = "";
        },
      });
      // The start position depends on the events list height + late-loading
      // fonts/photo; recompute once they've settled so the trigger is accurate.
      ScrollTrigger.refresh();
      const onLoad = () => ScrollTrigger.refresh();
      window.addEventListener("load", onLoad);
      cleanup = () => {
        window.removeEventListener("load", onLoad);
        st.kill();
        backdrop.style.transform = "";
        backdrop.style.willChange = "";
      };
    })();

    return () => {
      killed = true;
      cleanup();
    };
  }, []);

  return (
    <>
      <div ref={backdropRef} className={styles.backdrop} aria-hidden="true">
        {/* LCP element — present at first paint, no animation on the image. */}
        <img
          className={styles.photo}
          src="images/hero/meghan-hero.jpg"
          alt=""
          width={2849}
          height={1632}
          fetchPriority="high"
          decoding="async"
        />
        <div className={styles.scrim} />
      </div>

      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <ShowsSection upcoming={upcoming} justAdded={justAdded} past={past} />
          <div ref={markerRef} className={styles.releaseMarker} aria-hidden="true" />
        </div>
      </div>
    </>
  );
}
