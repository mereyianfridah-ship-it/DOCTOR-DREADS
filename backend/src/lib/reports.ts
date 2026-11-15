/** Pure helpers for the admin reports. */
export const PAID_ORDER_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

export interface DateRange { from: string; to: string }

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const addDaysIso = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Parses ?from=&to=; defaults to the last 30 days ending `today`. Swapped or malformed input is corrected, and the span is capped at one year. */
export function parseRange(from: unknown, to: unknown, today: string): DateRange {
  let t = typeof to === "string" && ISO.test(to) && !Number.isNaN(Date.parse(to)) ? to : today;
  let f = typeof from === "string" && ISO.test(from) && !Number.isNaN(Date.parse(from)) ? from : addDaysIso(t, -29);
  if (f > t) [f, t] = [t, f];
  if (f < addDaysIso(t, -365)) f = addDaysIso(t, -365);
  return { from: f, to: t };
}

/** Every date in the range, so charts show zero-days instead of gaps. */
export function fillDays<T extends { day: string }>(range: DateRange, rows: T[], zero: Omit<T, "day">): T[] {
  const byDay = new Map(rows.map((r) => [r.day, r]));
  const out: T[] = [];
  for (let d = range.from; d <= range.to; d = addDaysIso(d, 1)) out.push(byDay.get(d) ?? ({ day: d, ...zero } as T));
  return out;
}

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
