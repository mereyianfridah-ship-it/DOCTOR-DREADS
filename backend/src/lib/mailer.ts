import { config } from "../config.js";

export interface Mail { to: string; subject: string; text: string }

/** Test-only: messages that would have been sent, so tests can read reset links. */
export const testOutbox: Mail[] = [];

export const isMailConfigured = (): boolean => Boolean(config.mail.resendApiKey && config.mail.from);

/**
 * Sends one email. Never throws for "not configured": callers treat email as best-effort.
 * - Configured: Resend HTTP API (no extra dependency).
 * - Test: recorded in `testOutbox`.
 * - Development without config: printed to the console so the flow can be tried locally.
 * - Production without config: a warning only. The message body (which holds a secret link) is NOT logged.
 */
export async function sendMail(mail: Mail): Promise<boolean> {
  if (config.isTest) {
    testOutbox.push(mail);
    return true;
  }
  if (!isMailConfigured()) {
    if (config.isProd) console.warn(`[mail] Not sent to ${mail.to}: set RESEND_API_KEY and MAIL_FROM to enable email.`);
    else console.log(`\n[mail:dev] To: ${mail.to}\nSubject: ${mail.subject}\n${mail.text}\n`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.mail.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.mail.from, to: [mail.to], subject: mail.subject, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.error(`[mail] Resend rejected the message (${res.status})`);
    return res.ok;
  } catch (e) {
    console.error("[mail] Send failed:", e instanceof Error ? e.message : e);
    return false;
  }
}
