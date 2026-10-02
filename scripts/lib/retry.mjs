/**
 * One retry policy for every build-time WordPress read and download.
 *
 * The four prebuild scripts (`npm run build`) make ~60 single-shot requests
 * to admin.megcmusic.com before `next build` runs. A save in Meg's dashboard
 * fires exactly one rebuild, so one slow answer from her host used to strand
 * that save until the next unrelated trigger: on 2026-09-17 the EPK PDF sat
 * off the site until a later set-list save happened to rebuild it (Sprint 15,
 * `output/diagnosis.md`). fetch-wp-content.mjs already retried; the other
 * three scripts did not. This helper is that policy, in one place.
 *
 * It retries ANY error — a deterministic failure (a 404 on a missing slug) is
 * retried harmlessly and then surfaces with its original message, so every
 * script's named-cause exit is unchanged. Pure: no fetch inside, so it is
 * tested without a network (`retry.test.mjs`).
 *
 * The default window is five attempts with 2s/4s/8s/16s waits (~30s). The
 * original three attempts over 1s+2s lost nightly run 36739150271 to a 503
 * that outlasted it (issue #163); the host's blips run longer than 3s. A
 * deterministic failure now costs ~30s of build time before it surfaces.
 */

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call `fn` up to `attempts` times, waiting `delayMs` after the first
 * failure and doubling after each further one; rethrow the last error.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{ attempts?: number, delayMs?: number, sleep?: (ms: number) => Promise<void> }} [options]
 * @returns {Promise<T>}
 */
export async function withRetry(fn, { attempts = 5, delayMs = 2_000, sleep = pause } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt < attempts) await sleep(delayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
