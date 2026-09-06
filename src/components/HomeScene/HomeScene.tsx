"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ShowsSection } from "../ShowsSection/ShowsSection";
import { LoadingVeil, type VeilPhase } from "../LoadingVeil/LoadingVeil";
import type { TribeEvent } from "@/lib/api/events";
import styles from "./HomeScene.module.css";
import { heroImage } from "@/lib/hero-images";

/** Millisecond value of a duration token (e.g. "600ms" / "10s" / "36s"). */
function tokenMs(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  const value = parseFloat(raw);
  if (Number.isNaN(value)) return fallback;
  return raw.endsWith("ms") ? value : raw.endsWith("s") ? value * 1000 : value;
}

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
  const photoRef = useRef<HTMLImageElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const veilSlotRef = useRef<HTMLDivElement>(null);

  // Boot veil (2026-07-08 ADR): when the server render came back with zero
  // shows (datacenter-blocked deploys), a full-screen loading veil covers first
  // paint while the browser-side events fallback runs. Rendered in the server
  // HTML (phase starts "hold" when serverEmpty) so there is no hydration flash;
  // a server-populated render never mounts it. Lifecycle: hold (min 1200ms /
  // max 10s) → swell (a hold beat before the lift) → fade (veil lifts WHILE
  // the hero entrance runs beneath it) → done (unmount).
  const serverEmpty =
    upcoming.length === 0 && justAdded.length === 0 && past.length === 0;
  const [veilPhase, setVeilPhase] = useState<VeilPhase | "done">(
    serverEmpty ? "hold" : "done",
  );
  const [fallbackSettled, setFallbackSettled] = useState(false);
  const [forceFallback, setForceFallback] = useState(false);
  const veilStartRef = useRef(0);
  // Review affordance: hold the veil open indefinitely so the light motion can
  // be studied (set by ?veilhold=1, below).
  const reviewHoldRef = useRef(false);
  const veilActive = veilPhase !== "done";
  // The hero entrance is HELD (body stays "pending") until the veil's fade
  // begins, so the two choreographies crossfade instead of butt-joining.
  const veilHolding = veilPhase === "hold" || veilPhase === "swell";

  // ShowsSection reports when the browser fallback settles (data or failure —
  // either way the veil's job is done; what's beneath is cards, skeletons past
  // the cap, or the empty state on failure).
  const onFallbackSettled = useCallback(() => setFallbackSettled(true), []);

  // Dev preview only: ?veil=1 forces the veiled path locally, since local dev
  // reaches WP and serverEmpty never happens (positive, default-off flag —
  // learning #73). Dead-code-eliminated from production bundles.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (new URLSearchParams(window.location.search).get("veil") !== "1") return;
    setForceFallback(true);
    setVeilPhase((p) => (p === "done" ? "hold" : p));
  }, []);

  // Review affordance (any env): ?veilhold=1 forces the veil AND keeps it in
  // hold indefinitely, so the slow light motion can be watched on a deployed
  // preview (the live veil otherwise exits in ~1-2s once the browser fetch
  // resolves). Positive, default-off, and inert without the param (learning
  // #73); runs before the hold effect so the exit timer is never scheduled.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("veilhold") !== "1") return;
    reviewHoldRef.current = true;
    setForceFallback(true);
    setVeilPhase((p) => (p === "done" ? "hold" : p));
  }, []);

  // Hold: exit once the fallback settles (respecting the anti-flash min hold),
  // or at the cap if it hasn't — past the cap what's beneath is the existing
  // skeleton-card path (2026-07-08 skeleton ADR).
  useEffect(() => {
    if (veilPhase !== "hold") return;
    if (reviewHoldRef.current) return; // ?veilhold=1: never auto-exit
    if (!veilStartRef.current) veilStartRef.current = performance.now();
    const elapsed = performance.now() - veilStartRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = fallbackSettled
      ? Math.max(0, tokenMs("--mc-veil-hold-min", 1200) - elapsed)
      : Math.max(0, tokenMs("--mc-veil-hold-max", 10_000) - elapsed);
    const t = window.setTimeout(
      // Reduced motion skips the swell hold and fades straight out.
      () => setVeilPhase(reduce ? "fade" : "swell"),
      delay,
    );
    return () => window.clearTimeout(t);
  }, [veilPhase, fallbackSettled]);

  // Exit beats: swell (hold) → fade (veil lifts, entrance runs) → done.
  useEffect(() => {
    if (veilPhase === "swell") {
      const t = window.setTimeout(
        () => setVeilPhase("fade"),
        tokenMs("--mc-veil-swell", 600),
      );
      return () => window.clearTimeout(t);
    }
    if (veilPhase === "fade") {
      const t = window.setTimeout(
        () => setVeilPhase("done"),
        tokenMs("--mc-entrance-duration", 900),
      );
      return () => window.clearTimeout(t);
    }
  }, [veilPhase]);

  // While veiled, the covered page is inert — keyboard users can't tab into
  // content under the veil. The veil itself (role="status") stays live. Inert
  // everything except the veil's own ancestor chain: body-level siblings
  // (SiteChrome) plus the veil slot's siblings inside the page wrapper.
  useEffect(() => {
    if (!veilActive) return;
    const slot = veilSlotRef.current;
    if (!slot) return;
    const targets: Element[] = [];
    for (const el of Array.from(document.body.children)) {
      if (!el.contains(slot)) targets.push(el);
    }
    const parent = slot.parentElement;
    if (parent) {
      for (const el of Array.from(parent.children)) {
        if (el !== slot) targets.push(el);
      }
    }
    for (const el of targets) el.setAttribute("inert", "");
    return () => {
      for (const el of targets) el.removeAttribute("inert");
    };
  }, [veilActive]);

  // The hero photo is a fixed backdrop. When it decodes AFTER first paint (cold
  // network), Chrome doesn't always re-rasterize the fixed layer until a scroll
  // invalidates it — so the image only "snapped" to full-bleed on the first
  // scroll. Nudge a one-frame transform when the photo is ready to force the
  // repaint immediately.
  //
  // Readiness = decode(), not the load event: with decoding="async" `load`
  // fires when the bytes arrive but the bitmap may not be decoded yet, so a
  // load-timed nudge could land before there were pixels to rasterize (the
  // residual flakiness). decode() resolves only once the image is actually
  // paintable, and it waits for load internally, so it covers the cached
  // (already-complete) case too. On rejection (decode error) fall back to
  // load/complete so the nudge still runs.
  useEffect(() => {
    const backdrop = backdropRef.current;
    const photo = photoRef.current;
    if (!backdrop || !photo) return;

    let raf = 0;
    let cancelled = false;
    const nudge = () => {
      if (cancelled) return;
      // Skip if the release is currently driving the transform.
      if (backdrop.style.transform && backdrop.style.transform !== "translateZ(0px)") return;
      // Synchronous reflow first, so the transform toggle lands on fresh
      // layout instead of racing the browser's own pending invalidation.
      void backdrop.offsetHeight;
      backdrop.style.transform = "translateZ(0)";
      raf = requestAnimationFrame(() => {
        if (backdrop.style.transform === "translateZ(0px)") backdrop.style.transform = "";
      });
    };

    photo
      .decode()
      .catch(
        () =>
          new Promise<void>((resolve) => {
            if (photo.complete) return resolve();
            photo.addEventListener("load", () => resolve(), { once: true });
          }),
      )
      .then(nudge);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, []);

  // Entrance: mark the body hidden before paint, reveal on the next frame so the
  // CSS transition runs. Reduced motion skips straight to the settled state.
  // While the boot veil holds, the body stays "pending" — the entrance begins
  // only when the veil's fade phase starts, so the hero arrives under the
  // lifting veil.
  useLayoutEffect(() => {
    const { body } = document;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // The entrance's reduced path is unchanged: settled immediately (the
      // veil, when present, is a plain opacity fade over the settled page).
      body.dataset.home = "entered";
      return () => {
        delete body.dataset.home;
      };
    }
    if (veilHolding) {
      body.dataset.home = "pending";
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
  }, [veilHolding]);

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
        // Stay live to the bottom of the page: callbacks only fire on state
        // CHANGE, so a page entered (or hydrated) below a bounded range would
        // never receive one and the photo would sit full-bleed over the body
        // sections. With the range open-ended, every scroll below the release
        // line re-syncs the shift.
        end: "max",
        onUpdate: apply,
        onLeaveBack: () => {
          backdrop.style.transform = "";
          backdrop.style.willChange = "";
        },
      });
      // The start position depends on the events list height + late-loading
      // fonts/photo; recompute once they've settled so the trigger is accurate.
      // Then sync immediately — restored/deep scroll positions get the correct
      // shift without waiting for a scroll event.
      ScrollTrigger.refresh();
      apply();
      const onLoad = () => {
        ScrollTrigger.refresh();
        apply();
      };
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
          ref={photoRef}
          className={styles.photo}
          src={heroImage("home")}
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
          <ShowsSection
            upcoming={upcoming}
            justAdded={justAdded}
            past={past}
            forceFallback={forceFallback}
            onFallbackSettled={onFallbackSettled}
          />
          <div ref={markerRef} className={styles.releaseMarker} aria-hidden="true" />
        </div>
      </div>

      {veilActive && (
        <div ref={veilSlotRef}>
          <LoadingVeil phase={veilPhase} />
        </div>
      )}
    </>
  );
}
