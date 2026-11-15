import { all } from "../db.js";
import type { ClosureRule, Recurrence } from "./closures.js";

interface Row {
  id: number; stylist_id: string | null; recurrence: Recurrence; start_date: string | null; end_date: string | null;
  weekday: number | null; month_day: string | null; start_time: string | null; end_time: string | null; reason: string;
}

export const rowToRule = (r: Row): ClosureRule => ({
  id: r.id, stylistId: r.stylist_id, recurrence: r.recurrence, startDate: r.start_date, endDate: r.end_date,
  weekday: r.weekday === null ? null : Number(r.weekday), monthDay: r.month_day, startTime: r.start_time, endTime: r.end_time, reason: r.reason,
});

/** Closure rules from the owner's new rules table (no legacy rows). */
export async function loadStoredRules(): Promise<ClosureRule[]> {
  return (await all<Row>("SELECT * FROM closure_rules ORDER BY id")).map(rowToRule);
}

/**
 * Every closure rule in force: the new rules plus the older closed_days rows, which are whole-salon,
 * whole-day, one-off closures (given negative ids so they can't clash with stored rules).
 */
export async function loadRules(): Promise<ClosureRule[]> {
  const legacy = await all<{ date: string; reason: string }>("SELECT date, reason FROM closed_days");
  const rules = await loadStoredRules();
  return [
    ...legacy.map((d, i): ClosureRule => ({
      id: -(i + 1), stylistId: null, recurrence: "once", startDate: d.date, endDate: null, weekday: null, monthDay: null,
      startTime: null, endTime: null, reason: d.reason,
    })),
    ...rules,
  ];
}
