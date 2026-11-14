import { describe, expect, it } from "vitest";
import { appointmentStartMs, rescheduleEligibility } from "../src/lib/reschedule.js";
import { stylistIsFree } from "../src/routes/bookings.js";

const policy = { maxCount: 2, minHours: 24 };
// 2026-11-20 10:00 EAT = 07:00 UTC
const b = { status: "confirmed", date: "2026-11-20", time: "10:00", reschedule_count: 0 };
const at = (iso: string) => Date.parse(iso);

describe("appointmentStartMs", () => {
  it("reads salon times as East Africa Time (UTC+3)", () => {
    expect(appointmentStartMs("2026-11-20", "10:00")).toBe(at("2026-11-20T07:00:00Z"));
  });
});

describe("rescheduleEligibility", () => {
  it("allows an upcoming active booking with enough notice and reschedules left", () => {
    expect(rescheduleEligibility(b, policy, at("2026-11-15T00:00:00Z"))).toEqual({ allowed: true, reason: null });
    expect(rescheduleEligibility({ ...b, status: "pending_deposit" }, policy, at("2026-11-15T00:00:00Z")).allowed).toBe(true);
  });
  it("requires the notice period, exactly at the boundary", () => {
    expect(rescheduleEligibility(b, policy, at("2026-11-19T07:00:00Z")).allowed).toBe(true); // exactly 24h
    const late = rescheduleEligibility(b, policy, at("2026-11-19T07:00:01Z"));
    expect(late.allowed).toBe(false);
    expect(late.reason).toMatch(/24 hours/);
  });
  it("blocks past appointments", () => {
    expect(rescheduleEligibility(b, policy, at("2026-11-21T00:00:00Z")).allowed).toBe(false);
  });
  it("enforces the reschedule limit", () => {
    const r = rescheduleEligibility({ ...b, reschedule_count: 2 }, policy, at("2026-11-15T00:00:00Z"));
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/2 times/);
    expect(rescheduleEligibility({ ...b, reschedule_count: 1 }, policy, at("2026-11-15T00:00:00Z")).allowed).toBe(true);
  });
  it("only applies to active bookings", () => {
    for (const status of ["cancelled", "completed", "expired"])
      expect(rescheduleEligibility({ ...b, status }, policy, at("2026-11-15T00:00:00Z")).allowed).toBe(false);
  });
  it("tolerates a missing count and a malformed date", () => {
    expect(rescheduleEligibility({ ...b, reschedule_count: null }, policy, at("2026-11-15T00:00:00Z")).allowed).toBe(true);
    expect(rescheduleEligibility({ ...b, date: "garbage" }, policy, at("2026-11-15T00:00:00Z")).allowed).toBe(false);
  });
});

// Regression: windows used to be compared with Number("HH:MM") arithmetic, giving NaN and
// throwing "Invalid time value" as soon as any active booking existed on the date.
describe("stylistIsFree", () => {
  const windows = [{ id: 1, stylistId: "stylist-a", start: "10:00", duration: 60 }];
  it("does not throw when a booking already exists and detects overlap correctly", () => {
    expect(() => stylistIsFree(windows, "stylist-a", "11:00", 60)).not.toThrow();
    expect(stylistIsFree(windows, "stylist-a", "10:00", 60)).toBe(false);
    expect(stylistIsFree(windows, "stylist-a", "11:00", 60)).toBe(true); // back-to-back is fine
    expect(stylistIsFree(windows, "stylist-a", "09:00", 60)).toBe(true);
    expect(stylistIsFree(windows, "stylist-a", "09:30", 60)).toBe(false); // overlaps the start
  });
  it("respects each booking's own duration and other stylists' freedom", () => {
    const long = [{ id: 2, stylistId: "stylist-a", start: "10:00", duration: 180 }];
    expect(stylistIsFree(long, "stylist-a", "12:00", 60)).toBe(false);
    expect(stylistIsFree(long, "stylist-a", "13:00", 60)).toBe(true);
    expect(stylistIsFree(windows, "stylist-b", "10:00", 60)).toBe(true);
  });
});
