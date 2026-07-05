/**
 * Server-only Supabase client for the Booking Outreach Engine.
 *
 * Uses the service-role key, so it must NEVER be imported into a client
 * component or any code that ships to the browser. RLS is disabled on the
 * outreach tables (see the init migration); the service role is the only path
 * to them and every route handler reaches the DB through this one client.
 *
 * `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are server-only env (never
 * NEXT_PUBLIC_). We validate lazily so the module can be imported at build
 * without the vars present — a route only fails when it actually needs the DB.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function outreachDb(): SupabaseClient {
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
