/**
 * Show pipeline — email → WordPress (The Events Calendar) → Bandsintown CSV.
 *
 * Runs unattended on a GitHub Actions schedule against a dedicated Gmail
 * account. Meg emails a short template; the pipeline creates the event in
 * WordPress as a DRAFT, emails her a confirmation, and on her "YES" reply
 * publishes the event and sends back a Bandsintown Event Upload CSV.
 *
 * WordPress stays the single source of truth. The pipeline never publishes
 * without an explicit YES. Failures leave the message in INBOX so the next
 * run retries; a failed run notifies via GitHub's workflow-failure email.
 *
 * Auth is OAuth (XOAUTH2), not an app password. Google is winding app
 * passwords down and blocks them outright under Advanced Protection, so both
 * IMAP and SMTP authenticate with an access token minted from a long-lived
 * refresh token. Mint it once with scripts/show-pipeline/oauth-setup.mjs.
 *
 * The scope must be `https://mail.google.com/`. Gmail's narrower scopes
 * (gmail.modify, gmail.send) are API-only — IMAP and SMTP XOAUTH2 reject them.
 *
 * Env (GitHub secrets): PIPELINE_EMAIL, PIPELINE_CLIENT_ID,
 *   PIPELINE_CLIENT_SECRET, PIPELINE_REFRESH_TOKEN, WP_APP_USER,
 *   WP_APP_PASSWORD
 * Env (plain): ALLOWED_SENDERS (comma-sep), DRY_RUN ("1" = no writes/sends),
 *   WP_ORIGIN (override the WordPress host origin)
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

// WordPress moved to its own subdomain at the launch cutover — the apex
// `megcmusic.com` is now the Next front-end on Vercel and 403s every
// `/wp-json/*` path. Mirrors src/lib/wp-origin.ts; override with WP_ORIGIN.
const WP_ORIGIN = process.env.WP_ORIGIN ?? 'https://admin.megcmusic.com';
const WP_BASE = `${WP_ORIGIN}/wp-json/tribe/events/v1`;
// Public proof-of-life link for Meg's confirmation email — the WP `url` the
// API returns points at the admin subdomain, which is not what she should see.
const PUBLIC_SHOWS_URL = 'https://megcmusic.com/shows';
const TIMEZONE = 'America/Denver';
const PROCESSED_BOX = 'Pipeline/Processed';
const CONFIRM_TAG = /\[MC-(\d+)\]/;
const DRY = process.env.DRY_RUN === '1';

const env = (k) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing required env: ${k}`);
  return v;
};

const SELFTEST = process.env.SELFTEST === '1';
const PIPELINE_EMAIL = SELFTEST ? 'selftest@example.com' : env('PIPELINE_EMAIL');
const ALLOWED = (process.env.ALLOWED_SENDERS ?? 'meghanclarisse@gmail.com')
  .toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);

const wpAuth = SELFTEST ? '' : 'Basic ' + Buffer.from(`${env('WP_APP_USER')}:${env('WP_APP_PASSWORD')}`).toString('base64');

// ---------------------------------------------------------------- WordPress

async function wp(path, init = {}) {
  const res = await fetch(`${WP_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: wpAuth, ...init.headers },
    signal: AbortSignal.timeout(20_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`WP ${init.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  return body;
}

async function allVenues() {
  const venues = [];
  for (let page = 1; page <= 10; page++) {
    const data = await wp(`/venues?per_page=50&page=${page}`).catch(() => null);
    if (!data?.venues?.length) break;
    venues.push(...data.venues);
    if (page >= (data.total_pages ?? 1)) break;
  }
  return venues;
}

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function resolveVenue(show) {
  const venues = await allVenues();
  const hit = venues.find((v) => norm(v.venue) === norm(show.venue));
  if (hit) return hit;
  if (DRY) return { id: 0, venue: show.venue, city: show.city ?? '' };
  return wp('/venues', {
    method: 'POST',
    body: JSON.stringify({
      venue: show.venue,
      ...(show.address && { address: show.address }),
      ...(show.city && { city: show.city }),
      ...(!show.online && { stateprovince: show.region ?? 'CO', country: 'United States' }),
    }),
  });
}

async function findDuplicate(show) {
  const day = show.date.replaceAll('-', '');
  const data = await wp(`/events?start_date=${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)} 00:00:00&end_date=${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6)} 23:59:59&status=draft,publish`).catch(() => null);
  return data?.events?.find((e) => norm(e.venue?.venue ?? '') === norm(show.venue)) ?? null;
}

// ------------------------------------------------------------------ parsing

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];

// `now` is injectable so the self-test can freeze the clock. Without it the
// year-rollover branch below made every bare "Month D" assertion time-dependent
// — and one of them silently went red on 2026-07-26, failing the self-test step
// and stopping the whole scheduled pipeline for weeks. UTC throughout: the
// candidate was already built with Date.UTC, so reading the current year in
// local time was an off-by-one waiting for a negative-offset host.
function parseDate(raw, now = Date.now()) {
  const iso = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const named = raw.toLowerCase().match(/([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/);
  if (!named) return null;
  const mi = MONTHS.findIndex((m) => m.startsWith(named[1]));
  if (mi < 0) return null;
  let year = named[3] ? Number(named[3]) : new Date(now).getUTCFullYear();
  const candidate = new Date(Date.UTC(year, mi, Number(named[2])));
  // No year given and the date is >2 days past → she means next year.
  if (!named[3] && candidate.getTime() < now - 2 * 86_400_000) year += 1;
  return `${year}-${String(mi + 1).padStart(2, '0')}-${String(named[2]).padStart(2, '0')}`;
}

function parseClock(raw) {
  const m = raw.toLowerCase().match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (!m) return null;
  let h = Number(m[1]);
  if (m[3] === 'pm' && h < 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  // Bare small hours ("7") at a gig mean evening.
  if (!m[3] && h >= 1 && h <= 7) h += 12;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}

function parseTime(raw) {
  const [a, b] = raw.split(/\s*(?:-|–|to)\s*/);
  return { start: parseClock(a ?? '') ?? '19:00', end: b ? parseClock(b) : null };
}

/** Strip quoted reply tails, then read "Field: value" lines (forgiving aliases). */
function parseTemplate(text, now = Date.now()) {
  const lines = text.split('\n')
    .filter((l) => !l.trim().startsWith('>'))
    .join('\n').split(/^\s*On .+ wrote:\s*$/m)[0].split('\n');

  const fields = {};
  const alias = {
    date: 'date', when: 'date', venue: 'venue', where: 'venue', city: 'city',
    time: 'time', tickets: 'tickets', tix: 'tickets', ticket: 'tickets',
    stream: 'stream', link: 'stream', address: 'address', title: 'title',
    notes: 'notes', note: 'notes', region: 'region', state: 'region',
  };
  for (const line of lines) {
    const m = line.match(/^\s*([a-zA-Z]+)\s*:\s*(.+)$/);
    if (m && alias[m[1].toLowerCase()]) fields[alias[m[1].toLowerCase()]] = m[2].trim();
  }
  if (!Object.keys(fields).length) return null;

  const show = { ...fields };
  if (fields.date) {
    show.date = parseDate(fields.date, now);
    if (!show.date) return { error: `I couldn't read the date "${fields.date}". Try "2026-07-24" or "July 24".` };
  }
  if (fields.time) Object.assign(show, parseTime(fields.time));
  show.online = !!fields.stream || norm(fields.venue ?? '').match(/^(online|livestream|live stream)$/) != null;
  if (show.online) show.venue = 'Online';
  return show;
}

const missing = (show) =>
  ['date', 'venue'].filter((k) => !show[k]).map((k) => k[0].toUpperCase() + k.slice(1));

// ----------------------------------------------------------------- outbound

/**
 * A Gmail access token for XOAUTH2, cached until shortly before it expires.
 *
 * Both IMAP and SMTP take the same token, so it is minted once here rather
 * than letting nodemailer keep its own refresh loop — one code path to reason
 * about, and one place where a revoked grant surfaces.
 *
 * A refresh that fails is fatal and says so: `invalid_grant` almost always
 * means the OAuth consent screen is still in Testing, which caps refresh
 * tokens at ~7 days (studio learning #70). Do not retry past it — a dead grant
 * does not recover on its own, and a silent retry loop hides the cause.
 */
let cachedToken = null;
async function accessToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env('PIPELINE_CLIENT_ID'),
      client_secret: env('PIPELINE_CLIENT_SECRET'),
      refresh_token: env('PIPELINE_REFRESH_TOKEN'),
      grant_type: 'refresh_token',
    }),
    signal: AbortSignal.timeout(20000),
  });
  const body = await res.text();
  if (!res.ok) {
    const hint = body.includes('invalid_grant')
      ? ' — the grant is dead. Publish the OAuth consent screen (a Testing-status'
        + ' screen expires refresh tokens after ~7 days), then re-run'
        + ' scripts/show-pipeline/oauth-setup.mjs and update PIPELINE_REFRESH_TOKEN.'
      : '';
    throw new Error(`Gmail token refresh failed: HTTP ${res.status} ${body.slice(0, 200)}${hint}`);
  }
  const { access_token, expires_in } = JSON.parse(body);
  if (!access_token) throw new Error('Gmail token refresh returned no access_token');
  // Refresh a minute early so a long run never presents an expired token.
  cachedToken = { value: access_token, expiresAt: Date.now() + (expires_in - 60) * 1000 };
  return access_token;
}

async function smtpTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com', port: 465, secure: true,
    auth: { type: 'OAuth2', user: PIPELINE_EMAIL, accessToken: await accessToken() },
  });
}

async function send(to, subject, text, attachments = []) {
  if (DRY) return console.log(`[dry-run] would email ${to}: ${subject}`);
  const smtp = await smtpTransport();
  await smtp.sendMail({ from: `"MegC Show Robot" <${PIPELINE_EMAIL}>`, to, subject, text, attachments });
}

const TEMPLATE_HELP = `Here's the format I understand — one detail per line:

Date: July 24
Venue: Rock Rest Lodge
City: Golden
Time: 7pm-9pm
Tickets: https://... (optional)
Title: (optional — defaults to "Live at <venue>")
Notes: (optional)

For an online show, use "Venue: Online" and add "Stream: <link>".`;

function confirmBody(show, event) {
  const when = show.start ? ` · ${show.start}${show.end ? `–${show.end}` : ''}` : '';
  return `Got it! Here's what I'll put on megcmusic.com:

  ${event.title}
  ${show.date}${when}
  ${show.venue}${show.city ? `, ${show.city}` : ''}${show.online ? ' (online show)' : ''}${show.tickets ? `\n  Tickets: ${show.tickets}` : ''}

Reply YES to publish it. If anything's wrong, reply with the corrected lines
(e.g. "Time: 8pm-10pm") and I'll update it and check again.`;
}

// --------------------------------------------------------------- BIT CSV

function bitCsv(show, event) {
  const esc = (v = '') => `"${String(v).replaceAll('"', '""')}"`;
  const head = ['Venue', 'Country', 'Address', 'City', 'Region', 'Postal Code',
    'Start Date', 'End Date', 'Start Time', 'End Time', 'Streaming Link',
    'Ticket Link', 'Ticket Type', 'Event Name', 'Description', 'Timezone'];
  const row = [
    show.online ? 'Live Stream' : show.venue,
    'United States', show.address ?? '', show.city ?? '', show.region ?? 'CO', '',
    show.date, show.online ? show.date : '', show.start ?? '19:00',
    show.end ?? '', show.stream ?? '', show.tickets ?? '',
    show.tickets ? 'Tickets' : '', event.title, show.notes ?? '', TIMEZONE,
  ];
  return `${head.map(esc).join(',')}\n${row.map(esc).join(',')}\n`;
}

// -------------------------------------------------------------- processing

async function handleNewShow(from, subject, show) {
  const gaps = missing(show);
  if (gaps.length) {
    await send(from, `Re: ${subject}`, `Almost! I still need: ${gaps.join(', ')}.\n\n${TEMPLATE_HELP}`);
    return 'clarify';
  }
  const dupe = await findDuplicate(show);
  if (dupe) {
    await send(from, `Re: ${subject}`, `Looks like ${show.venue} on ${show.date} is already in the system ("${dupe.title}", ${dupe.status}). Nothing added — reply with corrections if it needs changing.`);
    return 'duplicate';
  }
  const venue = await resolveVenue(show);
  const title = show.title ?? `Live at ${show.venue}`;
  const payload = {
    title, status: 'draft',
    start_date: `${show.date} ${show.start ?? '19:00'}:00`,
    end_date: `${show.date} ${show.end ?? (show.start ? addHours(show.start, 2) : '21:00')}:00`,
    venue: venue.id,
    ...(show.notes && { description: show.notes }),
    ...(show.tickets && { website: show.tickets }),
  };
  if (DRY) { console.log('[dry-run] would create event:', payload); return 'dry'; }

  const created = await wp('/events', { method: 'POST', body: JSON.stringify(payload) });
  await wp(`/events/${created.id}`); // verify at the destination, not the POST echo
  await send(from, `Confirm your show [MC-${created.id}]`, confirmBody(show, created));
  return `draft ${created.id}`;
}

const addHours = (hhmm, n) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${String((h + n) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

async function handleReply(from, subject, text, eventId) {
  const event = await wp(`/events/${eventId}`);
  const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean) ?? '';

  if (/^(yes|yep|yeah|confirm|publish)\b/i.test(firstLine)) {
    if (DRY) { console.log(`[dry-run] would publish ${eventId}`); return 'dry'; }
    await wp(`/events/${eventId}`, { method: 'POST', body: JSON.stringify({ status: 'publish' }) });
    const live = await wp(`/events/${eventId}`);
    if (live.status !== 'publish') throw new Error(`Publish of ${eventId} did not stick (status: ${live.status})`);
    const show = {
      date: live.start_date.slice(0, 10), start: live.start_date.slice(11, 16),
      end: live.end_date?.slice(11, 16), venue: live.venue?.venue ?? '',
      city: live.venue?.city ?? '', address: live.venue?.address ?? '',
      region: live.venue?.stateprovince ?? 'CO', tickets: live.website ?? '',
      online: norm(live.venue?.venue ?? '') === 'online',
    };
    await send(from, `Re: ${subject}`,
      `It's live on megcmusic.com ✓\n${PUBLIC_SHOWS_URL}\n\nLast step for Bandsintown: open artists.bandsintown.com on your phone or laptop, go to Events → Upload, and drag in the attached file. That's it!`,
      [{ filename: `bandsintown-${show.date}.csv`, content: bitCsv(show, live) }]);
    return `published ${eventId}`;
  }

  const updates = parseTemplate(text);
  if (updates && !updates.error && Object.keys(updates).some((k) => ['date', 'venue', 'start', 'title', 'tickets', 'city', 'notes'].includes(k))) {
    if (DRY) { console.log(`[dry-run] would update ${eventId}:`, updates); return 'dry'; }
    const payload = {
      ...(updates.title && { title: updates.title }),
      ...(updates.date && { start_date: `${updates.date} ${updates.start ?? event.start_date.slice(11, 16)}:00` }),
      ...(!updates.date && updates.start && { start_date: `${event.start_date.slice(0, 10)} ${updates.start}:00` }),
      ...(updates.end && { end_date: `${updates.date ?? event.start_date.slice(0, 10)} ${updates.end}:00` }),
      ...(updates.tickets && { website: updates.tickets }),
      ...(updates.notes && { description: updates.notes }),
      ...(updates.venue && { venue: (await resolveVenue(updates)).id }),
    };
    await wp(`/events/${eventId}`, { method: 'POST', body: JSON.stringify(payload) });
    const fresh = await wp(`/events/${eventId}`);
    const show = {
      date: fresh.start_date.slice(0, 10), start: fresh.start_date.slice(11, 16),
      end: fresh.end_date?.slice(11, 16), venue: fresh.venue?.venue ?? '',
      city: fresh.venue?.city ?? '', tickets: fresh.website ?? '',
      online: norm(fresh.venue?.venue ?? '') === 'online',
    };
    await send(from, `Confirm your show [MC-${eventId}]`, `Updated!\n\n${confirmBody(show, fresh)}`);
    return `updated ${eventId}`;
  }

  await send(from, `Re: ${subject}`, `I wasn't sure what to do with that reply. Reply YES to publish, or send corrected lines like "Time: 8pm-10pm".${updates?.error ? `\n\n${updates.error}` : ''}`);
  return 'reask';
}

// --------------------------------------------------------------------- main

async function main() {
  const imap = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true, logger: false,
    auth: { user: PIPELINE_EMAIL, accessToken: await accessToken() },
  });
  await imap.connect();
  if (!(await imap.mailboxOpen(PROCESSED_BOX).catch(() => null))) {
    await imap.mailboxCreate(PROCESSED_BOX).catch(() => {});
  }

  const lock = await imap.getMailboxLock('INBOX');
  const queue = [];
  try {
    for await (const msg of imap.fetch('1:*', { uid: true, source: true })) {
      queue.push({ uid: msg.uid, source: msg.source });
    }
  } finally { lock.release(); }

  let handled = 0;
  for (const { uid, source } of queue) {
    const mail = await simpleParser(source);
    const from = mail.from?.value?.[0]?.address?.toLowerCase() ?? '';
    const subject = mail.subject ?? '(no subject)';
    const done = async (outcome) => {
      console.log(`✓ [${outcome}] ${from} — ${subject}`);
      if (!DRY) await imap.messageMove(String(uid), PROCESSED_BOX, { uid: true });
      handled++;
    };

    try {
      if (!ALLOWED.includes(from)) { await done('ignored-sender'); continue; }
      const tag = subject.match(CONFIRM_TAG);
      if (tag) { await done(await handleReply(from, subject, mail.text ?? '', Number(tag[1]))); continue; }
      const show = parseTemplate(mail.text ?? '');
      if (!show) {
        await send(from, `Re: ${subject}`, `Hi! I'm the show robot for megcmusic.com. I couldn't find show details in that email.\n\n${TEMPLATE_HELP}`);
        await done('no-template');
        continue;
      }
      if (show.error) {
        await send(from, `Re: ${subject}`, `${show.error}\n\n${TEMPLATE_HELP}`);
        await done('bad-field');
        continue;
      }
      await done(await handleNewShow(from, subject, show));
    } catch (err) {
      // Leave the message in INBOX — next run retries; the failed job emails Levi.
      console.error(`✗ left in inbox: ${from} — ${subject}\n  ${err.message}`);
      process.exitCode = 1;
    }
  }

  await imap.logout();
  console.log(`Done. ${handled}/${queue.length} messages handled.${DRY ? ' (dry run)' : ''}`);
}

// ------------------------------------------------------------- self-test
// SELFTEST=1 exercises the parser with no network or credentials needed.

function selftest() {
  const eq = (got, want, label) => {
    const g = JSON.stringify(got); const w = JSON.stringify(want);
    if (g !== w) throw new Error(`${label}\n  got  ${g}\n  want ${w}`);
    console.log(`✓ ${label}`);
  };
  // Frozen clock — 2026-06-15T12:00Z. Every bare "Month D" case below resolves
  // against THIS instant, not the wall clock, so these assertions stay true
  // forever. They did not before: "July 24" was pinned to a literal 2026, which
  // the rollover rule correctly re-read as 2027 from 2026-07-26 onward. The
  // self-test step gates the scheduled run, so that turned a rotted assertion
  // into a silently dead pipeline. Any new bare-month case MUST pass NOW.
  const NOW = Date.UTC(2026, 5, 15, 12);
  const t1 = parseTemplate('Date: 2026-07-24\nVenue: Rock Rest Lodge\nCity: Golden\nTime: 7pm-9pm\nTickets: https://t.co/x', NOW);
  eq([t1.date, t1.venue, t1.start, t1.end, t1.online],
    ['2026-07-24', 'Rock Rest Lodge', '19:00', '21:00', false], 'standard show');
  const t2 = parseTemplate('When: July 24\nWhere: The Ambler\ntime: 19:30', NOW);
  eq([t2.date, t2.venue, t2.start, t2.end], ['2026-07-24', 'The Ambler', '19:30', null], 'aliases + named month + 24h');
  const t3 = parseTemplate('Date: Aug 2\nVenue: Online\nTime: 7\nStream: https://youtu.be/x', NOW);
  eq([t3.online, t3.venue, t3.start], [true, 'Online', '19:00'], 'online show, bare evening hour');
  const t4 = parseTemplate('Date: sometime soon\nVenue: X', NOW);
  eq(!!t4.error, true, 'unreadable date errors instead of guessing');
  eq(parseTemplate('hey! are you coming to dinner?', NOW), null, 'non-show email yields null');
  eq(missing({ venue: 'X' }), ['Date'], 'missing-field detection');
  const t5 = parseTemplate('Date: Jan 5\nVenue: Shifterz\n\nOn Tue, Jul 1 wrote:\n> Date: old stuff\n> Venue: wrong', NOW);
  eq(t5.date, '2027-01-05', 'quoted lines stripped; past month rolls to next year');
  // The rollover rule itself, pinned from both sides of the frozen clock.
  eq(parseTemplate('Date: June 20\nVenue: X', NOW).date, '2026-06-20', 'future bare month keeps the current year');
  eq(parseTemplate('Date: June 1\nVenue: X', NOW).date, '2027-06-01', 'past bare month rolls forward');
  eq(parseTemplate('Date: June 14\nVenue: X', NOW).date, '2026-06-14', 'within the 2-day grace window, no roll');
  eq(parseTemplate('Date: Jan 5, 2024\nVenue: X', NOW).date, '2024-01-05', 'an explicit year is never rolled');
  console.log('All parser self-tests passed.');
}

if (process.env.SELFTEST === '1') {
  selftest();
} else {
  main().catch((err) => { console.error(err); process.exit(1); });
}
