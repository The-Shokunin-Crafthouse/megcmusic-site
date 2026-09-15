/**
 * Pre-send deliverability guard.
 *
 * Every bounce costs a little of a personal Gmail's sending reputation, and
 * through 2026-09-09 three of roughly eighteen outreach sends bounced (Jives
 * Coffee Lounge, Swallow Hill, Stargazers). This resolves MX for the
 * recipient domain before the send route hands anything to Gmail.
 *
 * WHAT IT CATCHES, AND WHAT IT DOESN'T
 *
 * It catches a domain that cannot receive mail at all — the Jives failure,
 * where jivescoffeelounge.com published no MX records. It falls back to
 * A/AAAA, which RFC 5321 permits as an implicit mail exchanger, so a domain
 * with a bare A record is treated as deliverable rather than blocked.
 *
 * It does NOT catch a live domain with a dead mailbox. Swallow Hill returned
 * 550 5.2.1 DisabledUser and Stargazers returned a Microsoft 365 "address
 * not found"; both domains have healthy MX. Catching those needs an SMTP
 * RCPT TO probe, which Google and Microsoft variously block, rate-limit, or
 * answer with a catch-all accept, and which reads as address harvesting from
 * the receiving end. That trade isn't worth it, so this stays a cheap filter
 * rather than a guarantee. Bounce classification in the weekly run's Step 1
 * remains the real backstop.
 *
 * FAIL-OPEN BY DESIGN: a resolver timeout or transient SERVFAIL returns
 * `ok`. Blocking a legitimate send because DNS hiccuped is worse than the
 * occasional bounce this is meant to prevent.
 */

import { promises as dns } from "node:dns";

export type Verdict = "ok" | "dead";

export interface DeliverabilityResult {
  verdict: Verdict;
  reason: string;
}

/** Definitive "this domain has no mail route" signals. Anything else is transient. */
const FATAL_DNS_CODES = new Set(["ENOTFOUND", "ENODATA", "NXDOMAIN"]);

const SYNTAX = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

async function hasAddressRecord(domain: string): Promise<boolean> {
  // Written out rather than looped: dns.resolve4/resolve6 have different
  // overload signatures, so a shared `.call` over both fails to typecheck.
  try {
    if ((await dns.resolve4(domain)).length > 0) return true;
  } catch {
    // a miss on A is not itself fatal; try AAAA
  }
  try {
    if ((await dns.resolve6(domain)).length > 0) return true;
  } catch {
    // no address record of either family
  }
  return false;
}

export async function checkDeliverability(
  address: string,
): Promise<DeliverabilityResult> {
  const email = (address ?? "").trim();
  if (!SYNTAX.test(email)) {
    return { verdict: "dead", reason: "malformed address" };
  }

  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();

  try {
    const mx = await dns.resolveMx(domain);
    if (mx.length > 0) return { verdict: "ok", reason: "MX present" };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code ?? "";
    if (!FATAL_DNS_CODES.has(code)) {
      // Resolver trouble, not a verdict. Fail open.
      return { verdict: "ok", reason: `MX lookup inconclusive (${code || "unknown"})` };
    }
  }

  // No MX. RFC 5321 allows an A/AAAA record to act as an implicit MX.
  if (await hasAddressRecord(domain)) {
    return { verdict: "ok", reason: "no MX, using implicit A/AAAA mail exchanger" };
  }

  return { verdict: "dead", reason: `no MX and no A/AAAA record for ${domain}` };
}
