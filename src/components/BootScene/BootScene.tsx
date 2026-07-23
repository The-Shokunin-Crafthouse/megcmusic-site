"use client";

import { useEffect, useRef } from "react";
import styles from "./BootScene.module.css";

// Boot scroll piece (Sprint 6 §5) — the comp's ornate pink boot (39:382),
// textured onto a lit 3D surface: the tooling reads as relief via a bump map,
// and warm/teal lights play across it as it tilts and drifts on scroll. Lazy,
// token-lit, reduced-motion safe, disposed on unmount.
const BOOT_SRC = "images/decor/boot.png";
const BOOT_ASPECT = 1227 / 1478;

// ——— Motion tuning (three.js world units / radians / seconds) ———————————
// Scroll-driven: progress runs 0 → 1 while the section transits the viewport.
const PARALLAX_X = 0.5; // horizontal drift — boot slides left as you scroll down
const PARALLAX_Y = 1.1; // vertical drift — boot rises as you scroll down
const PARALLAX_Y_CENTER = 0.35; // progress value where the boot sits at rest height
const TILT_Y = 0.55; // scroll lean around Y (light travels the leather)
const TILT_X = 0.16; // scroll lean around X
// Idle 3D drift: three offset sine waves so the boot slowly wanders in all
// three rotational axes (Lissajous, never repeats visibly). Off under
// reduced motion.
const SWAY_SPEED = 0.7; // global idle speed multiplier (1 ≈ 6s dominant period)
const SWAY_Y = 0.07; // idle yaw amplitude
const SWAY_X = 0.04; // idle pitch amplitude
const SWAY_Z = 0.025; // idle roll amplitude

export function BootScene() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const node: HTMLDivElement = host;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cleanup = () => {};
    let cancelled = false;

    (async () => {
      const THREE = await import("three");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      const { gsap } = await import("gsap");
      const texture = await new THREE.TextureLoader().loadAsync(BOOT_SRC);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;

      const css = getComputedStyle(document.documentElement);
      const color = (name: string, fallback: string) =>
        new THREE.Color(css.getPropertyValue(name).trim() || fallback);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, BOOT_ASPECT, 0.1, 100);
      camera.position.set(0, 0, 9);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      node.appendChild(renderer.domElement);

      // Textured boot with the tooling as bump relief (scaled ~0.7).
      const h = 3.64;
      const geo = new THREE.PlaneGeometry(h * BOOT_ASPECT, h);
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: texture,
        bumpScale: 0.5,
        transparent: true,
        roughness: 0.72,
        metalness: 0,
      });
      const boot = new THREE.Mesh(geo, mat);
      scene.add(boot);

      // Keep the art readable, then rake warm + teal light across the tooling.
      scene.add(new THREE.AmbientLight(0xffffff, 1.35));
      const key = new THREE.DirectionalLight(color("--mc-accent-gold", "#caa45f"), 1.8);
      key.position.set(5, 6, 4);
      scene.add(key);
      const rim = new THREE.DirectionalLight(color("--mc-teal-light", "#60b1ad"), 1.1);
      rim.position.set(-6, -1, 3);
      scene.add(rim);

      const dpr = Math.min(window.devicePixelRatio, 2);
      // Sync the drawing buffer to the host every render — robust against the
      // wrapper's height settling after the section's content loads.
      const syncSize = () => {
        const rect = node.getBoundingClientRect();
        const w = Math.round(rect.width);
        const hgt = Math.round(rect.height);
        if (!w || !hgt) return;
        if (
          renderer.domElement.width !== w * dpr ||
          renderer.domElement.height !== hgt * dpr
        ) {
          renderer.setSize(w, hgt, false);
          camera.aspect = w / hgt;
          camera.updateProjectionMatrix();
        }
      };
      const render = () => {
        syncSize();
        renderer.render(scene, camera);
      };
      const ro = new ResizeObserver(() => render());
      ro.observe(node);
      const onLoad = () => render();
      window.addEventListener("load", onLoad);

      let raf = 0;
      let active = true;
      let t = 0;
      let progress = 0;

      // A flat plane, so tilt (not spin — a full turn would show it edge-on).
      // Scroll leans it one way through while it drifts up-and-left (diagonal
      // parallax, same language as the Instagram picks); idle layers three
      // offset sines so it slowly wanders in yaw, pitch, and roll.
      const apply = () => {
        const drift = reduce ? 0 : t * SWAY_SPEED;
        boot.rotation.y =
          (progress - 0.5) * TILT_Y + (reduce ? 0 : Math.sin(drift) * SWAY_Y);
        boot.rotation.x =
          (0.5 - progress) * TILT_X +
          (reduce ? 0 : Math.sin(drift * 0.62) * SWAY_X);
        boot.rotation.z = reduce ? 0 : Math.sin(drift * 0.45 + 1.2) * SWAY_Z;
        boot.position.x = (0.5 - progress) * PARALLAX_X;
        boot.position.y = (progress - PARALLAX_Y_CENTER) * PARALLAX_Y;
        render();
      };

      // Defined before ScrollTrigger.create so onToggle (which can fire
      // synchronously during create) never hits the TDZ.
      const loop = () => {
        if (!active || reduce) return;
        t += 0.016;
        apply();
        raf = requestAnimationFrame(loop);
      };

      const st = ScrollTrigger.create({
        trigger: node,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          active = self.isActive;
          if (active && !reduce) loop();
        },
        onUpdate: (self) => {
          progress = self.progress;
          apply();
        },
      });

      apply();
      if (!reduce) loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("load", onLoad);
        st.kill();
        ro.disconnect();
        texture.dispose();
        geo.dispose();
        mat.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return <div ref={hostRef} className={styles.host} aria-hidden="true" />;
}
