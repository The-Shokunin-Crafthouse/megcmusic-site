/**
 * Shared HTTP helpers for the playbook route handlers. Cron routes are
 * guarded by CRON_SECRET (Vercel injects `Authorization: Bearer
 * ${CRON_SECRET}` automatically for cron invocations — PLAN.md §3); every
 * route returns JSON of the shape `{ error: string }` on failure.
 */

import { NextResponse } from "next/server";

/** True when the request carries Vercel's cron bearer token. Returns false
 *  (never throws) if CRON_SECRET is unset, so an un-provisioned deploy
 *  simply denies cron access rather than 500-ing. */
export function hasCronSecret(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const provided = req.headers.get("authorization");
  return provided === `Bearer ${expected}`;
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** 401 for a cron route reached without a valid bearer token. */
export function unauthorized(): NextResponse {
  return fail("Missing or invalid cron authorization.", 401);
}
