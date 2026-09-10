#!/usr/bin/env node
/**
 * Pre-send deliverability check for outreach addresses.
 *
 * Usage:
 *   node scripts/check-deliverability.mjs a@x.com b@y.org
 *   node scripts/check-deliverability.mjs --json a@x.com
 *
 * Exit code is 0 always; read the per-address verdict instead.
 *
 * THIS IS A MANUAL TOOL, run from a machine with working DNS. It does NOT
 * work from the agent sandbox, where outbound DNS is refused (ECONNREFUSED
 * on every lookup, including google.com) and so every address would come
 * back `dead`. The automated pre-send guard lives server-side instead, in
 * src/lib/outreach/deliverability.ts, called from the send route on Vercel
 * where DNS resolves normally. Use this script for spot-checking an address
 * by hand before adding a prospect.
 *
 * WHAT THIS CATCHES, AND WHAT IT DOESN'T
 *
 * It resolves MX (falling back to A/AAAA, which RFC 5321 permits as an
 * implicit mail exchanger). That reliably catches a domain that cannot
 * receive mail at all — the Jives Coffee Lounge failure mode, where
 * jivescoffeelounge.com had no MX records.
 *
 * It CANNOT catch a live domain with a dead mailbox. Both Swallow Hill
 * (550 5.2.1 DisabledUser) and Stargazers (Microsoft 365 "address not
 * found") had perfectly healthy MX and still bounced. Detecting those
 * needs an SMTP RCPT TO probe, which Google and Microsoft variously block,
 * rate-limit, or answer with a catch-all accept — and which looks like
 * address harvesting from the receiving end, so it can cost more sending
 * reputation than it saves. Deliberately not done here.
 *
 * So: this is a cheap filter that removed roughly one of the three bounces
 * seen through 2026-09-09, not a guarantee. Bounce classification in Step 1
 * remains the real backstop.
 */

import { promises as dns } from "node:dns";

/** Role addresses bounce more often than named ones; surfaced, not blocked. */
const ROLE_PREFIXES = new Set([
  "info", "booking", "events", "contact", "hello", "admin",
  "office", "music", "live", "bookings", "mail",
]);

const SYNTAX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

async function checkOne(address) {
  const email = String(address ?? "").trim();

  if (!SYNTAX.test(email)) {
    return { email, verdict: "dead", reason: "malformed address" };
  }

  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  const local = email.slice(0, email.lastIndexOf("@")).toLowerCase();
  const notes = [];
  if (ROLE_PREFIXES.has(local)) {
    notes.push("role address, higher bounce risk than a named person");
  }

  let mx = [];
  try {
    mx = await dns.resolveMx(domain);
  } catch {
    // fall through to the A/AAAA implicit-MX check
  }

  if (mx.length > 0) {
    const hosts = mx
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange);
    return { email, verdict: "ok", reason: `MX: ${hosts.slice(0, 2).join(", ")}`, notes };
  }

  for (const resolve of [dns.resolve4, dns.resolve6]) {
    try {
      const addrs = await resolve.call(dns, domain);
      if (addrs.length > 0) {
        return {
          email,
          verdict: "risky",
          reason: "no MX, but domain has an A/AAAA record (implicit MX)",
          notes,
        };
      }
    } catch {
      // keep trying
    }
  }

  return { email, verdict: "dead", reason: `no MX and no A/AAAA for ${domain}`, notes };
}

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const addresses = args.filter((a) => a !== "--json");

if (addresses.length === 0) {
  console.error("usage: node scripts/check-deliverability.mjs [--json] <email>...");
  process.exit(2);
}

const results = await Promise.all(addresses.map(checkOne));

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else {
  const mark = { ok: "OK  ", risky: "RISK", dead: "DEAD" };
  for (const r of results) {
    console.log(`${mark[r.verdict]} ${r.email.padEnd(38)} ${r.reason}`);
    for (const n of r.notes ?? []) console.log(`     ^ ${n}`);
  }
}
