"use client";

import { useEffect, useRef } from "react";
import styles from "./BootScene.module.css";

// Boot scroll piece (Sprint 6 §5) — a 3D cowboy boot (Three.js) that turns and
// settles as the visitor scrolls the discography, blended in like the comp's
// watermark (39:382). Lazy-loaded, reduced-motion safe, disposed on unmount.
// v1 geometry is an extruded boot silhouette; refine the profile from here.
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
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      // Colors from the token map so the boot stays on-palette.
      const css = getComputedStyle(document.documentElement);
      const hex = (name: string, fallback: string) =>
        new THREE.Color((css.getPropertyValue(name).trim() || fallback));

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      camera.position.set(0, 0, 9);

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      node.appendChild(renderer.domElement);

      // --- Boot silhouette (side profile), extruded into depth. ---
      const s = new THREE.Shape();
      s.moveTo(0.2, 3.0);
      s.quadraticCurveTo(0.7, 3.05, 1.15, 2.55);
      s.quadraticCurveTo(1.0, 1.7, 1.05, 1.15);
      s.lineTo(1.15, 0.7);
      s.quadraticCurveTo(1.7, 0.62, 2.25, 0.5);
      s.lineTo(2.5, 0.42);
      s.quadraticCurveTo(2.62, 0.3, 2.4, 0.18);
      s.lineTo(0.95, 0.12);
      s.lineTo(0.9, 0.0);
      s.lineTo(0.5, 0.0);
      s.lineTo(0.48, 0.42);
      s.lineTo(0.16, 0.44);
      s.quadraticCurveTo(0.0, 1.6, 0.05, 2.4);
      s.quadraticCurveTo(0.06, 2.9, 0.2, 3.0);

      const geo = new THREE.ExtrudeGeometry(s, {
        depth: 0.9,
        bevelEnabled: true,
        bevelThickness: 0.12,
        bevelSize: 0.1,
        bevelSegments: 3,
        curveSegments: 24,
      });
      geo.center();

      const mat = new THREE.MeshStandardMaterial({
        color: hex("--mc-text-card", "#4f2c3d"),
        roughness: 0.55,
        metalness: 0.1,
      });
      const boot = new THREE.Mesh(geo, mat);
      boot.scale.setScalar(1.15);
      scene.add(boot);

      // Warm western light: soft ambient + a key + a teal rim.
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const key = new THREE.DirectionalLight(hex("--mc-accent-gold", "#caa45f"), 2.2);
      key.position.set(4, 6, 6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(hex("--mc-teal-light", "#60b1ad"), 1.4);
      rim.position.set(-6, -2, 3);
      scene.add(rim);

      boot.rotation.x = 0.15;
      boot.rotation.y = -0.6;

      function resize() {
        const { clientWidth: w, clientHeight: h } = node;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(node);

      let raf = 0;
      let active = true; // render only while the section is near the viewport
      const render = () => {
        renderer.render(scene, camera);
      };

      // Scroll drives a slow turn + settle; a gentle idle bob keeps it alive.
      const st = ScrollTrigger.create({
        trigger: node,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          active = self.isActive;
          if (active) loop();
        },
        onUpdate: (self) => {
          if (reduce) return;
          boot.rotation.y = -0.6 + self.progress * Math.PI * 1.1;
          boot.rotation.z = (self.progress - 0.5) * 0.25;
          render();
        },
      });

      const loop = () => {
        if (!active || reduce) return;
        boot.rotation.y += 0.0016;
        render();
        raf = requestAnimationFrame(loop);
      };
      render();
      if (!reduce) loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        st.kill();
        ro.disconnect();
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
