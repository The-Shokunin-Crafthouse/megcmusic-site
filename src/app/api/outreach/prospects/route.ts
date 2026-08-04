/**
 * POST /api/outreach/prospects — machine-guarded bulk insert.
 *
 * Inserts an array of prospects, skipping any whose email already exists OR
 * whose org case-insensitively matches an existing row (org has no unique
 * index — venue names legitimately vary, so the match is done in the route).
 * Returns { inserted: id[], skipped: [{ email|org, reason }] } so the weekly
 * run can dedupe-verify what it sent.
 */

import { appDb } from "@/lib/api/appDb";
import { fail, hasMachineSecret, ok, unauthorized } from "@/lib/outreach/http";
import { isCategory } from "@/lib/outreach/types";

export const dynamic = "force-dynamic";

interface IncomingProspect {
  category: string;
  org: string;
  email: string;
  contact_name?: string | null;
  contact_role?: string | null;
  cc_email?: string | null;
  city?: string | null;
  source?: string | null;
  research_notes?: string | null;
}

interface SkipRecord {
  email?: string;
  org?: string;
  reason: string;
}

function asCleanString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

export async function POST(req: Request): Promise<Response> {
  if (!hasMachineSecret(req)) return unauthorized();

  const raw = (await req.json().catch(() => null)) as unknown;
  if (!Array.isArray(raw)) {
    return fail("Request body must be an array of prospects.", 400);
  }

  try {
    const db = appDb();

    // Existing keys, lowercased, for the dedupe checks.
    const existingRes = await db.from("prospects").select("email, org");
    if (existingRes.error) return fail(existingRes.error.message, 502);
    const seenEmails = new Set<string>();
    const seenOrgs = new Set<string>();
    for (const row of existingRes.data ?? []) {
      if (typeof row.email === "string") {
        seenEmails.add(row.email.toLowerCase());
      }
      if (typeof row.org === "string") seenOrgs.add(row.org.toLowerCase());
    }

    const skipped: SkipRecord[] = [];
    const toInsert: Record<string, unknown>[] = [];

    for (const item of raw as IncomingProspect[]) {
      const category = asCleanString(item?.category);
      const org = asCleanString(item?.org);
      const email = asCleanString(item?.email);

      if (!category || !org || !email) {
        skipped.push({
          email: typeof item?.email === "string" ? item.email : undefined,
          org: typeof item?.org === "string" ? item.org : undefined,
          reason: "missing required field (category, org, email)",
        });
        continue;
      }
      if (!isCategory(category)) {
        skipped.push({ email, org, reason: `invalid category "${category}"` });
        continue;
      }

      const emailKey = email.toLowerCase();
      const orgKey = org.toLowerCase();
      if (seenEmails.has(emailKey)) {
        skipped.push({ email, reason: "duplicate email" });
        continue;
      }
      if (seenOrgs.has(orgKey)) {
        skipped.push({ org, reason: "duplicate org (case-insensitive)" });
        continue;
      }

      seenEmails.add(emailKey);
      seenOrgs.add(orgKey);
      toInsert.push({
        category,
        org,
        email,
        contact_name: asCleanString(item.contact_name),
        contact_role: asCleanString(item.contact_role),
        city: asCleanString(item.city),
        source: asCleanString(item.source) ?? "web",
        research_notes: asCleanString(item.research_notes),
      });
    }

    let inserted: string[] = [];
    if (toInsert.length > 0) {
      const insertRes = await db
        .from("prospects")
        .insert(toInsert)
        .select("id");
      if (insertRes.error) return fail(insertRes.error.message, 502);
      inserted = (insertRes.data ?? []).map((r) => r.id as string);
    }

    return ok({ inserted, skipped });
  } catch (err) {
    return fail(
      err instanceof Error ? err.message : "Bulk insert failed.",
      500,
    );
  }
}
