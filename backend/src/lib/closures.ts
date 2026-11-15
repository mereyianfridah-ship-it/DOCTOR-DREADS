/**
 * Closure rules: whole-salon or per-stylist, one-off / weekly / yearly, all day or only part of it.
 * Pure functions only (no database), so the rules are easy to test. See closureStore.ts for loading.
 */
import { addDays, dayOfWeek, isValidISODate, timeToMinutes } from "./util.js";

export type Recurrence = "once" | "weekly" | "yearly";

export interface ClosureRule {
  id: number;
  /** null = the whole salon. */
  stylistId: string | null;
  recurrence: Recurrence;
  startDate: string | null;
  endDate: string | null;
  weekday: number | null;
  monthDay: string | null;
  /** Both null = closed all day. Otherwise the closed window is [startTime, endTime). */
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

export const isAllDay = (r: Pick<ClosureRule, "startTime" | "endTime">): boolean => r.startTime === null || r.endTime === null;

/** Does the rule apply on this calendar date (ignoring time of day and who it is for)? */
export function ruleCoversDate(r: ClosureRule, date: string): boolean {
  switch (r.recurrence) {
    case "once": {
      if (!r.startDate) return false;
      return date >= r.startDate && date <= (r.endDate ?? r.startDate);
    }
    case "weekly": {
      if (r.weekday === null || dayOfWeek(date) !== r.weekday) return false;
      if (r.startDate && date < r.startDate) return false;
      if (r.endDate && date > r.endDate) return false;
      return true;
    }
    case "yearly":
      return r.monthDay !== null && date.slice(5) === r.monthDay;
  }
}

const rulesFor = (rules: ClosureRule[], date: string, stylistId: string | null) =>
  rules.filter((r) => r.stylistId === stylistId && ruleCoversDate(r, date));

/** Reason text ("" if none given) when the whole salon is closed all day, otherwise null. */
export function salonClosedReason(rules: ClosureRule[], date: string): string | null {
  const hit = rulesFor(rules, date, null).find(isAllDay);
  return hit ? hit.reason : null;
}

/** Reason when this stylist is off all day, otherwise null. */
export function stylistOffReason(rules: ClosureRule[], date: string, stylistId: string): string | null {
  const hit = rulesFor(rules, date, stylistId).find(isAllDay);
  return hit ? hit.reason : null;
}

export interface ClosedWindow { from: string; to: string; reason: string }

/** Part-day closures that apply to the salon (stylistId = null) or to one stylist on this date. */
export function partialWindows(rules: ClosureRule[], date: string, stylistId: string | null): ClosedWindow[] {
  return rulesFor(rules, date, stylistId)
    .filter((r) => !isAllDay(r))
    .map((r) => ({ from: r.startTime!, to: r.endTime!, reason: r.reason }))
    .sort((a, b) => a.from.localeCompare(b.from));
}

/** The first rule (salon-wide or the stylist's own) that blocks [start, start+duration) on `date`, or null if the stylist is free. */
export function blockingClosure(
  rules: ClosureRule[], date: string, stylistId: string, start: string, durationMinutes: number,
): ClosureRule | null {
  const s = timeToMinutes(start);
  const e = s + durationMinutes;
  for (const r of rules) {
    if (r.stylistId !== null && r.stylistId !== stylistId) continue;
    if (!ruleCoversDate(r, date)) continue;
    if (isAllDay(r)) return r;
    if (s < timeToMinutes(r.endTime!) && timeToMinutes(r.startTime!) < e) return r;
  }
  return null;
}

export type DayState = { state: "open" } | { state: "partial"; windows: ClosedWindow[] } | { state: "closed"; reason: string };

/**
 * How a date looks to a customer. `stylistIds` are the stylists they could be booked with (one when they picked
 * someone, all active ones for "any"). A date is closed when the salon is closed, or every one of those stylists is off.
 */
export function dayState(rules: ClosureRule[], date: string, stylistIds: string[]): DayState {
  const salon = salonClosedReason(rules, date);
  if (salon !== null) return { state: "closed", reason: salon };
  if (stylistIds.length > 0) {
    const reasons = stylistIds.map((id) => stylistOffReason(rules, date, id));
    if (reasons.every((r) => r !== null)) return { state: "closed", reason: stylistIds.length === 1 ? (reasons[0] || "Stylist is off") : "No stylists available" };
  }
  const windows = [
    ...partialWindows(rules, date, null),
    ...(stylistIds.length === 1 ? partialWindows(rules, date, stylistIds[0]!) : []),
  ];
  return windows.length ? { state: "partial", windows } : { state: "open" };
}

/** Bookings an (existing or proposed) rule would collide with. */
export function countAffected(
  rule: ClosureRule, bookings: { date: string; time: string; stylistId: string; durationMinutes: number }[],
): number {
  return bookings.filter((b) => {
    if (rule.stylistId !== null && rule.stylistId !== b.stylistId) return false;
    if (!ruleCoversDate(rule, b.date)) return false;
    if (isAllDay(rule)) return true;
    const s = timeToMinutes(b.time);
    return s < timeToMinutes(rule.endTime!) && timeToMinutes(rule.startTime!) < s + b.durationMinutes;
  }).length;
}

// ---- validation of owner input ------------------------------------------------------------------

export interface RuleInput {
  stylistId: string | null;
  recurrence: Recurrence;
  startDate: string | null;
  endDate: string | null;
  weekday: number | null;
  monthDay: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_RANGE_DAYS = 366;

function validMonthDay(s: string): boolean {
  if (!/^\d{2}-\d{2}$/.test(s)) return false;
  return isValidISODate(`2024-${s}`); // 2024 is a leap year, so 02-29 is accepted
}

/** Returns the cleaned rule or a map of field errors. `today` is the salon's current date (YYYY-MM-DD). */
export function parseRuleInput(raw: unknown, today: string): { ok: true; value: RuleInput } | { ok: false; fields: Record<string, string> } {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (k: string) => (typeof src[k] === "string" ? (src[k] as string).trim() : "");
  const fields: Record<string, string> = {};

  const recurrence = text("recurrence") as Recurrence;
  if (!["once", "weekly", "yearly"].includes(recurrence)) fields.recurrence = "Choose once, weekly or yearly";

  const stylistId = text("stylistId") || null;
  const reason = text("reason");
  if (reason.length > 120) fields.reason = "Keep this under 120 characters";

  let startDate: string | null = null, endDate: string | null = null, weekday: number | null = null, monthDay: string | null = null;
  const sd = text("startDate"), ed = text("endDate");
  if (sd && !isValidISODate(sd)) fields.startDate = "Invalid date";
  if (ed && !isValidISODate(ed)) fields.endDate = "Invalid date";

  if (recurrence === "once") {
    if (!sd) fields.startDate = "Pick a date";
    else if (!fields.startDate) {
      if (sd < today) fields.startDate = "Pick today or a future date";
      startDate = sd;
      if (ed && !fields.endDate) {
        if (ed < sd) fields.endDate = "End date can't be before the start date";
        else if (ed > addDays(sd, MAX_RANGE_DAYS)) fields.endDate = `Keep ranges under ${MAX_RANGE_DAYS} days`;
        else if (ed !== sd) endDate = ed;
      }
    }
  } else if (recurrence === "weekly") {
    const w = typeof src.weekday === "number" ? src.weekday : text("weekday") === "" ? NaN : Number(text("weekday"));
    if (!Number.isInteger(w) || w < 0 || w > 6) fields.weekday = "Choose a day of the week";
    else weekday = w;
    if (sd && !fields.startDate) startDate = sd;
    if (ed && !fields.endDate) {
      if (sd && ed < sd) fields.endDate = "'Until' can't be before 'from'";
      else if (ed < today) fields.endDate = "'Until' is in the past";
      else endDate = ed;
    }
  } else if (recurrence === "yearly") {
    const md = text("monthDay");
    if (!validMonthDay(md)) fields.monthDay = "Choose a valid day and month";
    else monthDay = md;
  }

  const st = text("startTime"), et = text("endTime");
  let startTime: string | null = null, endTime: string | null = null;
  if (st || et) {
    if (!HHMM.test(st)) fields.startTime = "Use a time like 12:00";
    if (!HHMM.test(et)) fields.endTime = "Use a time like 14:00";
    if (!fields.startTime && !fields.endTime) {
      if (timeToMinutes(et) <= timeToMinutes(st)) fields.endTime = "End time must be after the start time";
      else { startTime = st; endTime = et; }
    }
  }

  if (Object.keys(fields).length) return { ok: false, fields };
  return { ok: true, value: { stylistId, recurrence, startDate, endDate, weekday, monthDay, startTime, endTime, reason } };
}

/** One-line description for admin lists and emails, e.g. "Every Monday, 12:00–14:00". */
export function describeRule(r: ClosureRule): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const when =
    r.recurrence === "weekly" ? `Every ${days[r.weekday ?? 0]}` :
    r.recurrence === "yearly" ? `Every year on ${r.monthDay}` :
    r.endDate ? `${r.startDate} to ${r.endDate}` : `${r.startDate}`;
  return isAllDay(r) ? `${when}, all day` : `${when}, ${r.startTime}–${r.endTime}`;
}
