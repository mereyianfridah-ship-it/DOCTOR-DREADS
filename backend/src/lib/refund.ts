import { appointmentStartMs } from "./reschedule.js";

/**
 * Deposit refund tiers, by notice given before the appointment.
 * Full refund at `fullHours` or more; `partialPercent` at `partialHours` or more; otherwise none.
 */
export interface RefundPolicy { fullHours: number; partialHours: number; partialPercent: number }

export interface RefundQuote {
  /** KSh the customer gets back. */
  amount: number;
  percent: number;
  tier: "full" | "partial" | "none" | "not_paid";
  /** Plain-language sentence shown to the customer. */
  message: string;
}

/**
 * What a customer would get back if they cancelled now.
 * Only a confirmed booking has a paid deposit; a held slot has nothing to refund.
 * A cancellation after the start time forfeits the deposit.
 */
export function refundQuote(
  b: { status: string; date: string; time: string; deposit_amount: number },
  policy: RefundPolicy,
  now = Date.now(),
): RefundQuote {
  if (b.status !== "confirmed")
    return { amount: 0, percent: 0, tier: "not_paid", message: "No deposit has been paid for this booking, so there is nothing to refund." };
  const start = appointmentStartMs(b.date, b.time);
  const hours = Number.isFinite(start) ? (start - now) / 3600_000 : -1;
  const deposit = Math.max(0, Math.trunc(Number(b.deposit_amount) || 0));
  if (hours >= policy.fullHours)
    return { amount: deposit, percent: 100, tier: "full", message: `Cancelling now (${policy.fullHours}+ hours before your appointment) earns a full deposit refund.` };
  if (hours >= policy.partialHours && policy.partialPercent > 0) {
    const percent = Math.min(100, Math.max(0, Math.trunc(policy.partialPercent)));
    return { amount: Math.floor((deposit * percent) / 100), percent, tier: "partial", message: `Cancelling now (less than ${policy.fullHours} hours before) earns a ${percent}% deposit refund.` };
  }
  return { amount: 0, percent: 0, tier: "none", message: `Cancelling less than ${policy.partialPercent > 0 ? policy.partialHours : policy.fullHours} hours before your appointment forfeits the deposit.` };
}
