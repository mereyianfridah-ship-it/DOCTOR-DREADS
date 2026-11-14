export interface ReschedulePolicy { maxCount: number; minHours: number }

/** Salon times are East Africa Time (UTC+3, no DST). */
export const appointmentStartMs = (date: string, time: string): number => Date.parse(`${date}T${time}:00+03:00`);

export interface Eligibility { allowed: boolean; reason: string | null }

/**
 * Whether a customer may move a booking themselves. Anything else is a conversation with the salon.
 * Only upcoming, active bookings qualify; a limit stops endless shuffling; and a notice period protects the stylist's day.
 */
export function rescheduleEligibility(
  b: { status: string; date: string; time: string; reschedule_count?: number | null },
  policy: ReschedulePolicy,
  now = Date.now(),
): Eligibility {
  if (b.status !== "pending_deposit" && b.status !== "confirmed")
    return { allowed: false, reason: "Only upcoming bookings can be rescheduled." };
  const used = Number(b.reschedule_count ?? 0);
  if (used >= policy.maxCount)
    return { allowed: false, reason: `This booking has already been rescheduled ${used} time${used === 1 ? "" : "s"}. Please contact the salon to change it again.` };
  const start = appointmentStartMs(b.date, b.time);
  if (!Number.isFinite(start)) return { allowed: false, reason: "This booking can't be rescheduled online." };
  if (start - now < policy.minHours * 3600_000)
    return { allowed: false, reason: `Changes need at least ${policy.minHours} hours' notice. Please contact the salon.` };
  return { allowed: true, reason: null };
}
