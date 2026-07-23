/**
 * Gmail API client for the outreach engine — send and thread-read only.
 *
 * Auth is a long-lived refresh token (run scripts/gmail-auth-setup.mjs once to
 * mint it). googleapis exchanges it for access tokens automatically; we never
 * persist a rotated token because the refresh token lives in env, not the DB.
 *
 * Server-only: imports googleapis and reads GMAIL_* secrets. Never ship to the
 * browser.
 */

import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";

export interface SentMessage {
  gmailMessageId: string;
  gmailThreadId: string;
}

export interface ThreadMessage {
  gmailMessageId: string;
  from: string;
  subject: string | null;
  snippet: string;
  body: string;
  /** true when the message was received (not sent by the account itself). */
  isInbound: boolean;
}

function gmailClient(): gmail_v1.Gmail {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Gmail env missing: set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN.",
    );
  }
  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth });
}

/** RFC 2822 message, base64url-encoded for the Gmail API `raw` field. */
function encodeMime(
  to: string,
  subject: string,
  body: string,
  replyTo?: string,
): string {
  const headers = [
    `To: ${to}`,
    ...(replyTo ? [`Reply-To: ${replyTo}`] : []),
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 7bit",
  ];
  const mime = `${headers.join("\r\n")}\r\n\r\n${body}`;
  return Buffer.from(mime)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Send a plain-text email. When `threadId` is given the message is delivered
 * into that Gmail thread (follow-ups); omit it to start a new thread. Gmail
 * populates the From header from the authenticated account.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
  /** Sets the Reply-To header — e.g. a booking enquirer, so a reply reaches them. */
  replyTo?: string;
}): Promise<SentMessage> {
  const gmail = gmailClient();
  const raw = encodeMime(params.to, params.subject, params.body, params.replyTo);
  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: params.threadId
      ? { raw, threadId: params.threadId }
      : { raw },
  });
  const { id, threadId } = res.data;
  if (!id || !threadId) {
    throw new Error("Gmail send returned no message/thread id.");
  }
  return { gmailMessageId: id, gmailThreadId: threadId };
}

function headerValue(
  payload: gmail_v1.Schema$MessagePart | undefined,
  name: string,
): string | null {
  const header = payload?.headers?.find(
    (h) => h.name?.toLowerCase() === name.toLowerCase(),
  );
  return header?.value ?? null;
}

/** Depth-first search for the first text/plain part; base64url-decoded. */
function extractPlainText(
  part: gmail_v1.Schema$MessagePart | undefined,
): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return Buffer.from(part.body.data, "base64").toString("utf8");
  }
  for (const child of part.parts ?? []) {
    const text = extractPlainText(child);
    if (text) return text;
  }
  return "";
}

/**
 * Fetch every message in a thread. `accountEmail` decides direction: a message
 * whose From contains the account address is outbound, everything else inbound.
 */
export async function fetchThreadMessages(
  threadId: string,
): Promise<ThreadMessage[]> {
  const gmail = gmailClient();
  const profile = await gmail.users.getProfile({ userId: "me" });
  const accountEmail = (profile.data.emailAddress ?? "").toLowerCase();

  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  const messages = res.data.messages ?? [];
  return messages.map((message) => {
    const from = headerValue(message.payload, "From") ?? "";
    const isInbound =
      accountEmail.length > 0 &&
      !from.toLowerCase().includes(accountEmail);
    const body = extractPlainText(message.payload);
    return {
      gmailMessageId: message.id ?? "",
      from,
      subject: headerValue(message.payload, "Subject"),
      snippet: message.snippet ?? "",
      body: body || (message.snippet ?? ""),
      isInbound,
    };
  });
}
