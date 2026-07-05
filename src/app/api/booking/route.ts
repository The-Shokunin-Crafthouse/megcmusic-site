/**
 * POST /api/booking — public booking / contact enquiries.
 *
 * Her live site uses a Jetpack (grunion) contact form with no headless submit
 * endpoint, and the WP host blocks datacenter IPs, so a server-side re-POST is a
 * dead end. Instead the form posts here and we email the enquiry straight to
 * Meghan's inbox via the Gmail API (reusing the outreach client), with the
 * enquirer set as Reply-To so she can answer them directly. Logged ADR
 * 2026-07-05.
 *
 * Public route (visitors submit), so there is no shared secret — spam is
 * handled with a hidden honeypot field + server-side validation. It never
 * reflects submitted values into HTML, only into a plain-text email.
 */
import { sendEmail } from "@/lib/api/gmail";

export const dynamic = "force-dynamic";

// A pragmatic email shape check — the real proof is Reply-To bouncing, not a
// regex, so this only rejects the obviously-invalid.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX = { name: 120, email: 200, message: 4000 } as const;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const data = payload as Record<string, unknown>;

  // Honeypot: real users never fill `company`. A bot that does gets a cheerful
  // 200 and nothing is sent — no signal that it was caught.
  if (str(data.company)) {
    return Response.json({ ok: true });
  }

  const name = str(data.name);
  const email = str(data.email);
  const message = str(data.message);

  const errors: Record<string, string> = {};
  if (!name) errors.name = "Please add your name.";
  else if (name.length > MAX.name) errors.name = "That name is too long.";
  if (!email) errors.email = "Please add an email so Meghan can reply.";
  else if (!EMAIL_RE.test(email) || email.length > MAX.email)
    errors.email = "That email doesn’t look right.";
  if (!message) errors.message = "Please add a few details about the show.";
  else if (message.length > MAX.message)
    errors.message = "That message is a little too long.";

  if (Object.keys(errors).length > 0) {
    return Response.json({ ok: false, errors }, { status: 400 });
  }

  const to = process.env.BOOKING_TO;
  if (!to) {
    // Misconfiguration, not the visitor's fault — surface a soft error and log.
    console.error("BOOKING_TO is not set; booking enquiry could not be sent.");
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  const body = [
    "New booking enquiry from megcmusic.com",
    "",
    `Name:  ${name}`,
    `Email: ${email}`,
    "",
    "Message:",
    message,
    "",
    "— Reply directly to this email to reach them.",
  ].join("\n");

  try {
    await sendEmail({
      to,
      subject: `Booking enquiry — ${name}`,
      body,
      replyTo: email,
    });
  } catch (err) {
    console.error("Booking send failed:", err);
    return Response.json({ ok: false, error: "send_failed" }, { status: 502 });
  }

  return Response.json({ ok: true });
}
