import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import vm from "node:vm";
import { build } from "esbuild";

/**
 * Behavioural guard for the Playbook service worker's API caching
 * (decisions 2026-10-10). Compiles the real `sw.ts` with esbuild, runs it in a
 * VM with stubbed worker globals, dispatches fetch events, and records which
 * Cache Storage buckets the worker opens. Outreach reads must never touch a
 * cache (NetworkFirst would replay a stale prospect list to the weekly run on
 * a slow cold start); other API reads keep their `pb-api` offline fallback.
 */

const ORIGIN = "https://megcmusic.com";

async function compileWorker(): Promise<string> {
  const out = await build({
    entryPoints: [path.join(import.meta.dirname, "sw.ts")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2022",
    logLevel: "silent",
  });
  return out.outputFiles[0].text;
}

type FetchListener = (event: unknown) => void;

/** Minimal stand-in: Serwist only checks `instanceof FetchEvent` and calls these. */
class FakeFetchEvent {
  readonly waits: Promise<unknown>[] = [];
  responded: Promise<unknown> | undefined;
  readonly preloadResponse = Promise.resolve(undefined);
  constructor(readonly request: Request) {}
  respondWith(p: Promise<unknown>) {
    this.responded = p;
  }
  waitUntil(p: Promise<unknown>) {
    this.waits.push(p);
  }
}

function bootWorker(code: string) {
  const opened: string[] = [];
  const fetched: string[] = [];
  const listeners: Record<string, FetchListener[]> = {};

  const fakeCache = {
    match: async () => undefined,
    put: async () => undefined,
    keys: async () => [],
    delete: async () => false,
    addAll: async () => undefined,
  };

  const self = {
    __SW_MANIFEST: [],
    location: new URL(`${ORIGIN}/serwist/sw.js`),
    registration: {
      scope: `${ORIGIN}/`,
      navigationPreload: { enable: async () => undefined },
    },
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined,
    addEventListener(type: string, fn: FetchListener) {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener() {},
    caches: {
      open: async (name: string) => {
        opened.push(name);
        return fakeCache;
      },
      match: async () => undefined,
      keys: async () => [],
      has: async () => false,
      delete: async () => false,
    },
    fetch: async (input: Request | string) => {
      fetched.push(typeof input === "string" ? input : input.url);
      return new Response(JSON.stringify({ fresh: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  };

  // The worker's global scope *is* `self`, so the VM context is `self` with
  // the platform globals the bundle reaches for bare (location, fetch, …).
  const scope: Record<string, unknown> = Object.assign(self, {
    caches: self.caches,
    Request,
    Response,
    Headers,
    URL,
    FetchEvent: FakeFetchEvent,
    ExtendableEvent: FakeFetchEvent,
    console,
    setTimeout,
    clearTimeout,
    queueMicrotask,
    navigator: { userAgent: "node" },
  });
  scope.self = scope;
  scope.globalThis = scope;
  const context = vm.createContext(scope);
  vm.runInContext(code, context);

  async function get(pathname: string): Promise<void> {
    const event = new FakeFetchEvent(new Request(`${ORIGIN}${pathname}`));
    for (const fn of listeners.fetch ?? []) fn(event);
    assert.ok(event.responded, `worker did not handle ${pathname}`);
    await event.responded;
    await Promise.allSettled(event.waits);
  }

  return { get, opened, fetched };
}

test("outreach API reads bypass Cache Storage entirely", async () => {
  const worker = bootWorker(await compileWorker());
  await worker.get("/api/outreach/summary");
  await worker.get("/api/outreach/run-state");
  assert.deepEqual(worker.opened, []);
  assert.equal(worker.fetched.length, 2);
});

test("other API reads still use the pb-api NetworkFirst cache", async () => {
  const worker = bootWorker(await compileWorker());
  await worker.get("/api/playbook/stats");
  assert.ok(worker.opened.includes("pb-api"), `opened: ${worker.opened.join(", ")}`);
});
