#!/usr/bin/env node
/**
 * gmail-auth-setup.mjs — run once to mint the outreach engine's Gmail refresh
 * token. Walks the OAuth consent flow on localhost and prints the refresh
 * token to paste into GMAIL_REFRESH_TOKEN (Vercel + .env.local).
 *
 * Prereqs (see PROMPT §2 / the PR checklist):
 *   1. Google Cloud project on Meghan's account, Gmail API enabled.
 *   2. OAuth client of type "Desktop app"; its client id + secret below.
 *   3. The OAuth consent screen PUBLISHED, not in Testing — a Testing-status
 *      screen caps refresh-token life at ~7 days and unattended sends die a
 *      week later (studio learning: oauth-refresh-needs-published-consent).
 *      This is the whole reason to re-run this script; publish first or the
 *      new token dies the same way. Verified dead 2026-09-06: invalid_grant.
 *
 * The minted token is written to .env.local and never printed — it is echoed
 * nowhere, so it cannot leak through terminal scrollback or an agent
 * transcript. The script prints the account it belongs to and a fingerprint.
 *
 * Usage:
 *   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... node scripts/gmail-auth-setup.mjs
 * or with the values already in .env.local:
 *   node --env-file=.env.local scripts/gmail-auth-setup.mjs
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { google } from "googleapis";

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const PORT = 4599;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET. Set them in the env or .env.local.",
  );
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: "offline",
  prompt: "consent", // force a refresh_token even on re-auth
  scope: SCOPES,
});

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.url.startsWith("/oauth2callback")) {
    res.writeHead(404).end();
    return;
  }
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end(`Authorization failed: ${error ?? "no code returned"}`);
    console.error(`\nAuthorization failed: ${error ?? "no code returned"}`);
    server.close();
    process.exit(1);
  }

  try {
    const { tokens } = await oauth2.getToken(code);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Done — you can close this tab and return to the terminal.");

    if (!tokens.refresh_token) {
      console.error(
        "\nNo refresh_token returned. Revoke prior access at https://myaccount.google.com/permissions and re-run (prompt=consent needs a fresh grant).",
      );
      server.close();
      process.exit(1);
    }

    // The token is written straight to .env.local and never printed. A secret
    // echoed to a terminal ends up in scrollback, in shell history tooling and
    // in any agent transcript that ran the command; the file it belongs in is
    // already gitignored. Copy it from there for Vercel.
    const envPath = path.join(process.cwd(), ".env.local");
    const line = `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`;
    let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    env = /^GMAIL_REFRESH_TOKEN=.*$/m.test(env)
      ? env.replace(/^GMAIL_REFRESH_TOKEN=.*$/m, line)
      : (env.endsWith("\n") || env === "" ? env : env + "\n") + line + "\n";
    fs.writeFileSync(envPath, env, { mode: 0o600 });

    // Prove the mint before declaring success: exchange it once and read the
    // profile back. A token that cannot refresh is the failure this script
    // exists to fix, so finding out now beats finding out from a dead cron.
    const probe = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    probe.setCredentials({ refresh_token: tokens.refresh_token });
    const gmail = google.gmail({ version: "v1", auth: probe });
    const { data: profile } = await gmail.users.getProfile({ userId: "me" });
    let aliases = [];
    try {
      const { data } = await gmail.users.settings.sendAs.list({ userId: "me" });
      aliases = (data.sendAs ?? []).map(
        (a) => `${a.sendAsEmail}${a.isPrimary ? " (primary)" : " (send-as)"}`,
      );
    } catch {
      aliases = ["(sendAs not readable with these scopes)"];
    }

    const t = tokens.refresh_token;
    console.log("\n=== Gmail refresh token minted ===");
    console.log(`  account   : ${profile.emailAddress}`);
    console.log(`  addresses : ${aliases.join(", ") || "none listed"}`);
    console.log(`  token     : ${t.slice(0, 6)}…${t.slice(-4)} (${t.length} chars)`);
    console.log(`  written to: ${envPath} (not printed — copy it from there)`);
    console.log("  refresh   : verified — exchanged once and read the profile back");
    console.log(
      "\nSet the same value as GMAIL_REFRESH_TOKEN in Vercel (all environments).",
    );
    console.log(
      "If the OAuth consent screen is still in Testing, this token expires in ~7 days.\n",
    );
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Token exchange failed — see terminal.");
    console.error("\nToken exchange failed:", err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log("\nOpen this URL in the browser signed in as Meghan's account:\n");
  console.log(authUrl);
  console.log(`\nWaiting for the redirect on ${REDIRECT_URI} …`);
});
