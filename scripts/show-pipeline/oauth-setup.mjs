#!/usr/bin/env node
/**
 * oauth-setup.mjs — mint the show pipeline's Gmail refresh token.
 *
 * The pipeline authenticates to IMAP and SMTP with XOAUTH2 rather than an app
 * password: Google is winding app passwords down and refuses to issue them at
 * all under Advanced Protection, which is how this conversion started.
 *
 * Prereqs:
 *   1. The `megcmusic-outreach` Google Cloud project — already In production,
 *      External, Gmail API enabled. Nothing to create, nothing to publish.
 *   2. Its OWN OAuth client of type "Desktop app", named `show-pipeline`, not
 *      the outreach client. Grants are per user per client, so two clients
 *      means rotating or deleting one never breaks the other. Sharing the
 *      project costs nothing; sharing the client would.
 *   3. The consent screen PUBLISHED, not in Testing — already true for this
 *      project. A Testing-status screen expires refresh tokens after ~7 days
 *      (studio learning #70). Note that publishing does NOT make a grant
 *      permanent: a mailbox password change or a 2-Step Verification change
 *      revokes Gmail-scoped refresh tokens outright, which is what killed the
 *      outreach token on 2026-09-06 despite this project being In production.
 *      Expect to re-run this script after any such change.
 *
 *      https://mail.google.com/ is a restricted scope, so a published app
 *      Google has not verified shows an "unverified app" interstitial —
 *      Advanced → Go to (unsafe) — and is capped at 100 users. Fine for one
 *      mailbox. Publishing unverified still lifts the 7-day expiry.
 *   4. Sign in as the PIPELINE mailbox when the browser opens — not Meg's
 *      personal account. The pipeline moves every message it sees out of
 *      INBOX, so pointing it at a human inbox empties that inbox into a
 *      folder on the first non-dry run.
 *
 * Usage, from the repo root:
 *   PIPELINE_CLIENT_ID=... PIPELINE_CLIENT_SECRET=... \
 *     node scripts/show-pipeline/oauth-setup.mjs
 *
 * The token is written to .env.local (gitignored) and never printed. Copy it
 * from there into the PIPELINE_REFRESH_TOKEN GitHub Actions secret.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const CLIENT_ID = process.env.PIPELINE_CLIENT_ID;
const CLIENT_SECRET = process.env.PIPELINE_CLIENT_SECRET;

// Load-bearing on both sides. The OAuth client is a Web application type, so
// this exact URI — scheme, host, port, path — is registered in the Google Cloud
// console under Authorized redirect URIs. Changing PORT here without changing
// it there fails at consent with redirect_uri_mismatch, which reads like a
// broken app rather than a config drift. A Desktop-app client would accept any
// loopback port; this one does not.
const PORT = 4600;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

// IMAP and SMTP XOAUTH2 accept only the full mail scope. The narrower Gmail
// API scopes (gmail.modify, gmail.send) authenticate against the REST API and
// are rejected by the mail servers, which is a confusing failure to debug —
// the connection is refused as a bad credential, not as a bad scope.
const SCOPE = 'https://mail.google.com/';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing PIPELINE_CLIENT_ID / PIPELINE_CLIENT_SECRET in the env.');
  process.exit(1);
}

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent', // force a refresh_token even on a repeat grant
  });

function writeEnv(token) {
  const envPath = path.join(process.cwd(), '.env.local');
  const line = `PIPELINE_REFRESH_TOKEN=${token}`;
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  env = /^PIPELINE_REFRESH_TOKEN=.*$/m.test(env)
    ? env.replace(/^PIPELINE_REFRESH_TOKEN=.*$/m, line)
    : (env === '' || env.endsWith('\n') ? env : env + '\n') + line + '\n';
  fs.writeFileSync(envPath, env, { mode: 0o600 });
  return envPath;
}

/** Prove the token before claiming success — a mint that cannot refresh is
 *  the failure this script exists to prevent. */
async function verify(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`refresh check failed: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const { access_token } = await res.json();
  const prof = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!prof.ok) throw new Error(`profile read failed: ${prof.status}`);
  return prof.json();
}

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith('/oauth2callback')) return res.writeHead(404).end();
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end(`Authorization failed: ${error ?? 'no code'}`);
    console.error(`\nAuthorization failed: ${error ?? 'no code returned'}`);
    server.close();
    process.exit(1);
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${JSON.stringify(tokens).slice(0, 300)}`);

    if (!tokens.refresh_token) {
      res.writeHead(400, { 'Content-Type': 'text/plain' }).end('No refresh token — see terminal.');
      console.error(
        '\nNo refresh_token returned. Revoke prior access at ' +
        'https://myaccount.google.com/permissions and re-run.',
      );
      server.close();
      process.exit(1);
    }

    const profile = await verify(tokens.refresh_token);
    const envPath = writeEnv(tokens.refresh_token);
    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Done — close this tab and return to the terminal.');

    const t = tokens.refresh_token;
    console.log('\n=== Show pipeline refresh token minted ===');
    console.log(`  mailbox    : ${profile.emailAddress}`);
    console.log(`  scope      : ${SCOPE} (IMAP + SMTP)`);
    console.log(`  token      : ${t.slice(0, 6)}…${t.slice(-4)} (${t.length} chars)`);
    console.log(`  written to : ${envPath} — not printed; copy it from there`);
    console.log('  refresh    : verified — exchanged once and read the profile back');
    console.log(
      `\nSet these four GitHub Actions secrets (Settings → Secrets and variables → Actions):\n` +
      `  PIPELINE_EMAIL          = ${profile.emailAddress}\n` +
      `  PIPELINE_CLIENT_ID      = (this OAuth client's id)\n` +
      `  PIPELINE_CLIENT_SECRET  = (this OAuth client's secret)\n` +
      `  PIPELINE_REFRESH_TOKEN  = (from ${path.basename(envPath)})\n`,
    );
    if (profile.emailAddress?.toLowerCase() === 'meghanclarisse@gmail.com') {
      console.log(
        '⚠️  That is Meg\'s personal mailbox. The pipeline moves EVERY message it\n' +
        '    sees out of INBOX into Pipeline/Processed, including mail from senders\n' +
        '    it ignores. Point it at the dedicated shows account instead.\n',
      );
    }
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Token exchange failed — see terminal.');
    console.error('\n', err.message ?? err);
    server.close();
    process.exit(1);
  }
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\nPort ${PORT} is already in use, and it cannot simply be changed: it is\n` +
      `part of the redirect URI registered on the OAuth client\n` +
      `(${REDIRECT_URI}). Free the port and re-run — or register a new URI in\n` +
      `the Google Cloud console and change PORT here to match.\n\n` +
      `What is holding it:  lsof -nP -iTCP:${PORT} -sTCP:LISTEN\n`,
    );
    process.exit(1);
  }
  console.error('\n', err.message ?? err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log('\nOpen this URL in a browser signed in as the PIPELINE mailbox:\n');
  console.log(authUrl.toString());
  console.log(`\nWaiting for the redirect on ${REDIRECT_URI} …`);
});
