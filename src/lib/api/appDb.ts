/**
 * Server-only Supabase client for the project's scoped app database
 * (`megcmusic-outreach` project — holds outreach state and, from Sprint 09,
 * social-playbook state; WordPress remains the site's content source of
 * truth).
 *
 * Uses the service-role key, so it must NEVER be imported into a client
 * component or any code that ships to the browser. RLS is disabled on every
 * table (see the migrations); the service role is the only path to them and
 * every route handler reaches the DB through this one client.
 *
 * `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are server-only env (never
 * NEXT_PUBLIC_). We validate lazily so the module can be imported at build
 * without the vars present — a route only fails when it actually needs the DB.
 */

import {
  createClient,
  type PostgrestError,
  type SupabaseClient,
} from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function appDb(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-only).",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

/**
 * PostgREST caps an unbounded `.select()` at its `max-rows` setting (1000 by
 * default) and reports nothing — no error, no truncation flag — so a read that
 * outgrows the cap silently returns a partial set and any aggregation over it
 * is quietly wrong. Every read that can exceed 1000 rows must page explicitly.
 */
const PAGE_SIZE = 1000;

/** The `{ data, error }` shape every supabase-js query resolves to. */
type PageResult<T> = { data: T[] | null; error: PostgrestError | null };

/**
 * Exhaust a query by paging with `.range()` until a page comes back empty.
 *
 * `page(from, to)` must build a *fresh* query each call — a supabase-js builder
 * is single-use — and must carry a stable sort (`.order("id", …)`), or rows can
 * repeat or vanish across page boundaries as the server's ordering shifts.
 *
 * Advances by the number of rows actually returned rather than by PAGE_SIZE, so
 * a server-side `max-rows` lower than PAGE_SIZE pages correctly instead of
 * stopping one short page in. Costs one extra empty request per call.
 *
 * Returns the error rather than throwing, matching the supabase-js convention
 * the route handlers already branch on (see studio learnings #84/#85).
 * `rows` holds whatever was collected before the failure.
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ rows: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];
  for (let from = 0; ; ) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { rows, error };
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length === 0) return { rows, error: null };
    from += batch.length;
  }
}

/**
 * Max ids per `.in(...)` filter. PostgREST takes filters in the query string, so
 * a single `.in()` over every actionable prospect grows the URL without bound —
 * at ~39 bytes per quoted uuid, a few hundred ids already approach the common
 * 8KB request-line limit and the query starts failing with a 414. Callers chunk
 * the id list and merge the results.
 */
const ID_CHUNK_SIZE = 200;

/** Split ids into `.in()`-sized chunks. Returns `[]` for an empty list. */
export function chunkIds<T>(ids: readonly T[], size = ID_CHUNK_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}
