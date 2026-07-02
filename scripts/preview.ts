/**
 * preview.ts — per-sprint breakpoint snapshots for a built Next app.
 *
 * Serves the production build (`next start`) and drives headless Google
 * Chrome over the DevTools Protocol, setting a true CSS layout viewport per
 * breakpoint via Emulation.setDeviceMetricsOverride (studio learning #55 —
 * Chrome's --window-size sizes the canvas, not the layout viewport). No
 * Playwright/Puppeteer dependency: system Chrome + the Node 21+ global
 * WebSocket only.
 *
 * Usage: npm run preview <sprint-name>
 * Output: previews/<sprint-name>/{390,768,1024,1440}.png
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { createRequire } from "node:module";
import net from "node:net";

// Resolve the Next binary through Node module resolution rather than a literal
// node_modules/.bin path — this worktree has no local node_modules and shares
// the parent repo's deps (studio learning #8).
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

const sprint = process.argv[2];
if (!sprint) {
  console.error("usage: npm run preview <sprint-name>");
  process.exit(1);
}

const PORT = 3210;
const CDP_PORT = 9333;
const ORIGIN = `http://127.0.0.1:${PORT}/`;
// Snapshot a route other than "/" by setting PREVIEW_PATH (e.g. "/shows").
const TARGET = process.env.PREVIEW_PATH
  ? new URL(process.env.PREVIEW_PATH, ORIGIN).href
  : ORIGIN;
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PROFILE = "/tmp/megc-preview-chrome";
const OUT = `previews/${sprint}`;
const DEVICE_SCALE = 1;

const SHOTS = [
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: true },
  { name: "1024", width: 1024, height: 768, mobile: false },
  { name: "1440", width: 1440, height: 900, mobile: false },
];

function tcpUp(port: number): Promise<boolean> {
  return new Promise((res) => {
    const s = net.connect(port, "127.0.0.1");
    s.once("connect", () => {
      s.destroy();
      res(true);
    });
    s.once("error", () => res(false));
  });
}

async function waitTcp(port: number, label: string, ms = 60000): Promise<void> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await tcpUp(port)) return;
    await sleep(300);
  }
  throw new Error(`${label} (port ${port}) never came up`);
}

/** Minimal id-correlated CDP client over a single page-target WebSocket. */
class Cdp {
  private ws!: WebSocket;
  private id = 0;
  private pending = new Map<number, (v: Record<string, unknown>) => void>();

  static async attach(): Promise<Cdp> {
    const targets = (await (
      await fetch(`http://127.0.0.1:${CDP_PORT}/json`)
    ).json()) as Array<{ type: string; webSocketDebuggerUrl: string }>;
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("no Chrome page target found");

    const cdp = new Cdp();
    cdp.ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise<void>((res, rej) => {
      cdp.ws.addEventListener("open", () => res(), { once: true });
      cdp.ws.addEventListener("error", () => rej(new Error("CDP socket error")), {
        once: true,
      });
    });
    cdp.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(ev.data as string) as { id?: number };
      if (msg.id && cdp.pending.has(msg.id)) {
        cdp.pending.get(msg.id)!(msg as Record<string, unknown>);
        cdp.pending.delete(msg.id);
      }
    });
    return cdp;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  send(method: string, params?: unknown): Promise<any> {
    const id = ++this.id;
    return new Promise((res) => {
      this.pending.set(id, res);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close(): void {
    this.ws.close();
  }
}

async function evaluate(cdp: Cdp, expression: string, awaitPromise = false) {
  return cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  });
}

async function waitSettled(cdp: Cdp): Promise<void> {
  for (let i = 0; i < 120; i++) {
    const r = await evaluate(cdp, "document.readyState");
    if (r.result?.result?.value === "complete") break;
    await sleep(100);
  }
  // fonts + image decode so the hero photo and lockup are painted
  await evaluate(cdp, "document.fonts.ready", true);
  await evaluate(
    cdp,
    "Promise.all([...document.images].map(i => i.decode().catch(() => {})))",
    true,
  );
  await sleep(500);
}

async function main(): Promise<void> {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  rmSync(PROFILE, { recursive: true, force: true });

  const server = spawn(process.execPath, [nextBin, "start", "-p", String(PORT)], {
    stdio: "ignore",
  });
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${CDP_PORT}`,
      "--remote-allow-origins=*",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${PROFILE}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const cleanup = () => {
    server.kill("SIGKILL");
    chrome.kill("SIGKILL");
  };
  process.on("exit", cleanup);

  try {
    await waitTcp(PORT, "next start");
    await waitTcp(CDP_PORT, "chrome devtools");
    await sleep(500);

    const cdp = await Cdp.attach();
    await cdp.send("Page.enable");

    for (const shot of SHOTS) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: shot.width,
        height: shot.height,
        deviceScaleFactor: DEVICE_SCALE,
        mobile: shot.mobile,
        screenWidth: shot.width,
        screenHeight: shot.height,
      });
      await cdp.send("Page.navigate", { url: TARGET });
      await waitSettled(cdp);

      // Optional: frame a section instead of the page top. Set PREVIEW_SCROLL
      // to a CSS selector and the shot is taken with that element scrolled near
      // the top — for sprints whose surface lives below a full-height hero.
      // Default (unset) keeps the original top-of-page behaviour.
      if (process.env.PREVIEW_SCROLL) {
        const selector = process.env.PREVIEW_SCROLL;
        await evaluate(
          cdp,
          `(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            if (!el) return;
            const y = el.getBoundingClientRect().top + window.scrollY - 24;
            window.scrollTo(0, Math.max(0, y));
          })()`,
        );
        await sleep(450);
      }

      const out = await cdp.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      });
      writeFileSync(`${OUT}/${shot.name}.png`, Buffer.from(out.result.data, "base64"));
      console.log(`✓ ${shot.name}.png  (${shot.width}×${shot.height})`);
    }

    cdp.close();
    console.log(`\n${SHOTS.length} snapshots → ${OUT}/`);
  } finally {
    cleanup();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
