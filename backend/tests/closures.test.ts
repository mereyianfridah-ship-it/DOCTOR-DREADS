import { describe, expect, it } from "vitest";
import {
  blockingClosure, countAffected, dayState, parseRuleInput, ruleCoversDate, salonClosedReason, stylistOffReason,
  type ClosureRule,
} from "../src/lib/closures.js";

let n = 0;
const rule = (p: Partial<ClosureRule>): ClosureRule => ({
  id: ++n, stylistId: null, recurrence: "once", startDate: null, endDate: null, weekday: null, monthDay: null,
  startTime: null, endTime: null, reason: "", ...p,
});

// 2026-11-16 is a Monday, 2026-11-17 a Tuesday.
describe("ruleCoversDate", () => {
  it("one-off single day and ranges", () => {
    const one = rule({ startDate: "2026-12-25" });
    expect(ruleCoversDate(one, "2026-12-25")).toBe(true);
    expect(ruleCoversDate(one, "2026-12-26")).toBe(false);
    const range = rule({ startDate: "2026-12-24", endDate: "2026-12-26" });
    expect(["2026-12-23", "2026-12-24", "2026-12-26", "2026-12-27"].map((d) => ruleCoversDate(range, d))).toEqual([false, true, true, false]);
  });
  it("weekly, with optional from/until window", () => {
    const mon = rule({ recurrence: "weekly", weekday: 1 });
    expect(ruleCoversDate(mon, "2026-11-16")).toBe(true);
    expect(ruleCoversDate(mon, "2026-11-17")).toBe(false);
    const windowed = rule({ recurrence: "weekly", weekday: 1, startDate: "2026-11-23", endDate: "2026-11-30" });
    expect(["2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07"].map((d) => ruleCoversDate(windowed, d))).toEqual([false, true, true, false]);
  });
  it("yearly repeats every year", () => {
    const xmas = rule({ recurrence: "yearly", monthDay: "12-25" });
    expect(ruleCoversDate(xmas, "2026-12-25")).toBe(true);
    expect(ruleCoversDate(xmas, "2027-12-25")).toBe(true);
    expect(ruleCoversDate(xmas, "2027-12-24")).toBe(false);
  });
});

describe("salon and stylist closures", () => {
  const rules = [
    rule({ recurrence: "weekly", weekday: 1, reason: "Rest day" }),
    rule({ startDate: "2026-11-17", startTime: "12:00", endTime: "14:00", reason: "Staff meeting" }),
    rule({ stylistId: "amina", startDate: "2026-11-18", endDate: "2026-11-19", reason: "Leave" }),
    rule({ stylistId: "amina", recurrence: "weekly", weekday: 5, startTime: "15:00", endTime: "18:00" }),
  ];
  it("reports whole-day salon and stylist closures", () => {
    expect(salonClosedReason(rules, "2026-11-16")).toBe("Rest day");
    expect(salonClosedReason(rules, "2026-11-17")).toBeNull(); // only part of the day
    expect(stylistOffReason(rules, "2026-11-18", "amina")).toBe("Leave");
    expect(stylistOffReason(rules, "2026-11-18", "brian")).toBeNull();
  });
  it("blocks only overlapping times for part-day closures", () => {
    const at = (time: string, dur = 60, id = "brian") => blockingClosure(rules, "2026-11-17", id, time, dur) !== null;
    expect(at("11:00")).toBe(false);         // ends 12:00, touches but doesn't overlap
    expect(at("11:30")).toBe(true);
    expect(at("13:00")).toBe(true);
    expect(at("14:00")).toBe(false);         // starts as the closure ends
    expect(at("10:30", 120)).toBe(true);     // a long service runs into the closure
  });
  it("a stylist's own rules only affect that stylist", () => {
    expect(blockingClosure(rules, "2026-11-19", "amina", "10:00", 60)).not.toBeNull();
    expect(blockingClosure(rules, "2026-11-19", "brian", "10:00", 60)).toBeNull();
    // Friday part-day for amina (2026-11-20 is a Friday)
    expect(blockingClosure(rules, "2026-11-20", "amina", "16:00", 60)).not.toBeNull();
    expect(blockingClosure(rules, "2026-11-20", "amina", "10:00", 60)).toBeNull();
  });
});

describe("dayState (date picker)", () => {
  const rules = [
    rule({ stylistId: "amina", startDate: "2026-11-18" }),
    rule({ stylistId: "brian", startDate: "2026-11-18" }),
    rule({ stylistId: "amina", startDate: "2026-11-19" }),
    rule({ startDate: "2026-11-20", startTime: "09:00", endTime: "11:00", reason: "Training" }),
    rule({ startDate: "2026-11-21", reason: "Holiday" }),
  ];
  it("closes a date when the salon is closed or every candidate stylist is off", () => {
    expect(dayState(rules, "2026-11-21", ["amina"])).toEqual({ state: "closed", reason: "Holiday" });
    expect(dayState(rules, "2026-11-18", ["amina", "brian"]).state).toBe("closed");
    expect(dayState(rules, "2026-11-19", ["amina", "brian"]).state).toBe("open"); // brian still works
    expect(dayState(rules, "2026-11-19", ["amina"]).state).toBe("closed");
  });
  it("marks part-day closures and ignores unrelated days", () => {
    expect(dayState(rules, "2026-11-20", ["amina"])).toEqual({ state: "partial", windows: [{ from: "09:00", to: "11:00", reason: "Training" }] });
    expect(dayState(rules, "2026-11-22", ["amina"]).state).toBe("open");
  });
});

describe("countAffected", () => {
  it("counts only bookings the rule actually collides with", () => {
    const bookings = [
      { date: "2026-11-17", time: "12:30", stylistId: "amina", durationMinutes: 60 },
      { date: "2026-11-17", time: "15:00", stylistId: "amina", durationMinutes: 60 },
      { date: "2026-11-17", time: "13:00", stylistId: "brian", durationMinutes: 60 },
    ];
    expect(countAffected(rule({ startDate: "2026-11-17", startTime: "12:00", endTime: "14:00" }), bookings)).toBe(2);
    expect(countAffected(rule({ stylistId: "brian", startDate: "2026-11-17" }), bookings)).toBe(1);
  });
});

describe("parseRuleInput", () => {
  const today = "2026-11-15";
  it("accepts and cleans valid input", () => {
    const r = parseRuleInput({ recurrence: "weekly", weekday: "1", startTime: "12:00", endTime: "14:00", reason: " Lunch ", stylistId: "" }, today);
    expect(r).toEqual({ ok: true, value: { stylistId: null, recurrence: "weekly", startDate: null, endDate: null, weekday: 1, monthDay: null, startTime: "12:00", endTime: "14:00", reason: "Lunch" } });
  });
  it("rejects bad input with field errors", () => {
    const bad = (x: unknown) => { const r = parseRuleInput(x, today); return r.ok ? null : Object.keys(r.fields).sort(); };
    expect(bad({})).toEqual(["recurrence"]);
    expect(bad({ recurrence: "once" })).toEqual(["startDate"]);
    expect(bad({ recurrence: "once", startDate: "2026-11-01" })).toEqual(["startDate"]);
    expect(bad({ recurrence: "once", startDate: "2026-12-02", endDate: "2026-12-01" })).toEqual(["endDate"]);
    expect(bad({ recurrence: "weekly", weekday: 9 })).toEqual(["weekday"]);
    expect(bad({ recurrence: "yearly", monthDay: "02-30" })).toEqual(["monthDay"]);
    expect(bad({ recurrence: "yearly", monthDay: "02-29" })).toBeNull();
    expect(bad({ recurrence: "weekly", weekday: 1, startTime: "14:00", endTime: "12:00" })).toEqual(["endTime"]);
    expect(bad({ recurrence: "weekly", weekday: 1, startTime: "14:00" })).toEqual(["endTime"]);
  });
  it("treats a one-day range as a single day", () => {
    const r = parseRuleInput({ recurrence: "once", startDate: "2026-12-01", endDate: "2026-12-01" }, today);
    expect(r.ok && r.value.endDate).toBeNull();
  });
});
