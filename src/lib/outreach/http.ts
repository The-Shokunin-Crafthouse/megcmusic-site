/**
 * Shared HTTP helpers for the outreach route handlers: the machine-secret
 * guard and structured JSON responses. Every route returns JSON of the shape
 * `{ error: string }` on failure so the page and the weekly run parse errors
 * uniformly.
 */

import { NextResponse } from "next/server";

const SECRET_HEADER = "x-outreach-secret";

/**
 * True when the request carries a valid machine secret. Machine routes reject
 * with 401 when this is false; the dual-caller prospects PATCH uses it to widen
 * the accepted field set. Returns false (never throws) if the env is unset, so
 * an un-provisioned deploy simply denies machine access rather than 500-ing.
 */
export function hasMachineSecret(req: Request): boolean {
  const expected = process.env.OUTREACH_API_SECRET;
  if (!expected) return false;
  const provided = req.headers.get(SECRET_HEADER);
  return typeof provided === "string" && provided === expected;
}

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/** 401 for a machine route reached without a valid secret. */
export function unauthorized(): NextResponse {
  return fail("Missing or invalid x-outreach-secret header.", 401);
}
