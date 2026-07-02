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
 * Env (GitHub secrets): PIPELINE_EMAIL, PIPELINE_APP_PASSWORD,
 *   WP_APP_USER, WP_APP_PASSWORD
 * Env (plain): ALLOWED_SENDERS (comma-sep), DRY_RUN ("1" = no writes/sends)
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

const WP_BASE = 'https://megcmusic.com/wp-json/tribe/events/v1';
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

function parseDate(raw) {
  const iso = raw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const named = raw.toLowerCase().match(/([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/);
  if (!named) return null;
  const mi = MONTHS.findIndex((m) => m.startsWith(named[1]));
  if (mi < 0) return null;
  let year = named[3] ? Number(named[3]) : new Date().getFullYear();
  const candidate = new Date(Date.UTC(year, mi, Number(named[2])));
  // No year given and the date is >2 days past → she means next year.
  if (!named[3] && candidate.getTime() < Date.now() - 2 * 86_400_000) year += 1;
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
function parseTemplate(text) {
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
    show.date = parseDate(fields.date);
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

const smtp = SELFTEST ? null : nodemailer.createTransport({
  host: 'smtp.gmail.com', port: 465, secure: true,
  auth: { user: PIPELINE_EMAIL, pass: env('PIPELINE_APP_PASSWORD') },
});

async function send(to, subject, text, attachments = []) {
  if (DRY) return console.log(`[dry-run] would email ${to}: ${subject}`);
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
      `It's live on megcmusic.com ✓\n${live.url}\n\nLast step for Bandsintown: open artists.bandsintown.com on your phone or laptop, go to Events → Upload, and drag in the attached file. That's it!`,
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
    auth: { user: PIPELINE_EMAIL, pass: env('PIPELINE_APP_PASSWORD') },
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
  const t1 = parseTemplate('Date: 2026-07-24\nVenue: Rock Rest Lodge\nCity: Golden\nTime: 7pm-9pm\nTickets: https://t.co/x');
  eq([t1.date, t1.venue, t1.start, t1.end, t1.online],
    ['2026-07-24', 'Rock Rest Lodge', '19:00', '21:00', false], 'standard show');
  const t2 = parseTemplate('When: July 24\nWhere: The Ambler\ntime: 19:30');
  eq([t2.date, t2.venue, t2.start, t2.end], ['2026-07-24', 'The Ambler', '19:30', null], 'aliases + named month + 24h');
  const t3 = parseTemplate('Date: Aug 2\nVenue: Online\nTime: 7\nStream: https://youtu.be/x');
  eq([t3.online, t3.venue, t3.start], [true, 'Online', '19:00'], 'online show, bare evening hour');
  const t4 = parseTemplate('Date: sometime soon\nVenue: X');
  eq(!!t4.error, true, 'unreadable date errors instead of guessing');
  eq(parseTemplate('hey! are you coming to dinner?'), null, 'non-show email yields null');
  eq(missing({ venue: 'X' }), ['Date'], 'missing-field detection');
  const t5 = parseTemplate('Date: Jan 5\nVenue: Shifterz\n\nOn Tue, Jul 1 wrote:\n> Date: old stuff\n> Venue: wrong');
  eq(t5.date, '2027-01-05', 'quoted lines stripped; past month rolls to next year');
  console.log('All parser self-tests passed.');
}

if (process.env.SELFTEST === '1') {
  selftest();
} else {
  main().catch((err) => { console.error(err); process.exit(1); });
}
