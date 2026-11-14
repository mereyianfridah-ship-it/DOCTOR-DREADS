import { config } from "../config.js";
import { all, run } from "../db.js";
import { isMailConfigured, sendMail } from "./mailer.js";
import { appointmentStartMs } from "./reschedule.js";
import { addDays, nowIso, todayEAT } from "./util.js";

export interface ReminderCandidate {
  status: string;
  date: string;
  time: string;
  reminder_sent_at?: string | null;
}

/**
 * Pure rule: remind a confirmed booking once, when it is still ahead but no more than `hoursBefore` away.
 * Anything already started, too far off, not confirmed, or already reminded is left alone.
 */
export function isReminderDue(b: ReminderCandidate, hoursBefore: number, now = Date.now()): boolean {
  if (b.status !== "confirmed" || b.reminder_sent_at) return false;
  const start = appointmentStartMs(b.date, b.time);
  if (!Number.isFinite(start) || start <= now) return false;
  return start - now <= hoursBefore * 3600_000;
}

const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function reminderMessage(b: { full_name: string; email: string; reference: string; service_name: string; date: string; time: string; location: string }) {
  const where = b.location === "mobile" ? "We'll come to you (mobile appointment)." : "See you at the salon.";
  return {
    to: b.email,
    subject: `Reminder: your Dr Dread Kenya appointment on ${prettyDate(b.date)} at ${b.time}`,
    text:
      `Hi ${String(b.full_name).split(" ")[0]},\n\n` +
      `This is a friendly reminder of your upcoming appointment (${b.service_name}) on ${prettyDate(b.date)} at ${b.time} (East Africa Time). ${where}\n\n` +
      `Reference: ${b.reference}\n\n` +
      `If you can no longer make it, please contact the salon as soon as you can so the slot can be offered to someone else.`,
  };
}

export interface ReminderRun { sent: number; failed: number; skipped: boolean }

/**
 * Sends every reminder that is due. Safe to call repeatedly and from several instances:
 * each booking is claimed with a conditional UPDATE before the email goes out, and the claim is
 * released if the send fails so the next run retries.
 * When email isn't configured nothing is claimed, so reminders start flowing once it is.
 */
export async function sendDueReminders(now = Date.now()): Promise<ReminderRun> {
  const { enabled, hoursBefore } = config.reminders;
  if (!enabled || (!config.isTest && !isMailConfigured())) return { sent: 0, failed: 0, skipped: true };

  const today = todayEAT(new Date(now));
  const rows = await all<any>(
    `SELECT b.id, b.reference, b.date, b.time, b.status, b.reminder_sent_at, b.full_name, b.email, b.location, s.name AS service_name
     FROM bookings b JOIN services s ON s.slug = b.service_slug
     WHERE b.status = 'confirmed' AND b.reminder_sent_at IS NULL AND b.date >= $1 AND b.date <= $2
     ORDER BY b.date, b.time`,
    today, addDays(today, Math.ceil(hoursBefore / 24) + 1),
  );

  let sent = 0, failed = 0;
  for (const b of rows) {
    if (!isReminderDue(b, hoursBefore, now)) continue;
    const claim = await run("UPDATE bookings SET reminder_sent_at=$1 WHERE id=$2 AND status='confirmed' AND reminder_sent_at IS NULL", nowIso(), b.id);
    if (claim.rowCount !== 1) continue; // another run got there first, or the booking just changed
    const ok = await sendMail(reminderMessage(b)).catch(() => false);
    if (ok) sent++;
    else {
      failed++;
      await run("UPDATE bookings SET reminder_sent_at=NULL WHERE id=$1", b.id);
    }
  }
  return { sent, failed, skipped: false };
}
