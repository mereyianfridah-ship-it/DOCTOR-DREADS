import { describe, expect, it } from "vitest";
import { contactLine, isReminderDue, reminderMessage } from "../src/lib/reminders.js";
import { appointmentStartMs } from "../src/lib/reschedule.js";

// 2026-11-20 10:00 EAT = 07:00 UTC
const b = { status: "confirmed", date: "2026-11-20", time: "10:00", reminder_sent_at: null };
const at = (iso: string) => Date.parse(iso);

describe("isReminderDue", () => {
  it("is due inside the window and not before it", () => {
    expect(isReminderDue(b, 24, at("2026-11-19T06:00:00Z"))).toBe(false); // 25h away
    expect(isReminderDue(b, 24, at("2026-11-19T07:00:00Z"))).toBe(true);  // exactly 24h
    expect(isReminderDue(b, 24, at("2026-11-20T03:00:00Z"))).toBe(true);  // 4h away
  });
  it("never reminds once the appointment has started", () => {
    expect(isReminderDue(b, 24, at("2026-11-20T07:00:00Z"))).toBe(false);
    expect(isReminderDue(b, 24, at("2026-11-21T00:00:00Z"))).toBe(false);
  });
  it("only reminds confirmed bookings, once", () => {
    const now = at("2026-11-20T03:00:00Z");
    for (const status of ["pending_deposit", "cancelled", "completed", "expired"]) expect(isReminderDue({ ...b, status }, 24, now)).toBe(false);
    expect(isReminderDue({ ...b, reminder_sent_at: "2026-11-19T08:00:00Z" }, 24, now)).toBe(false);
  });
  it("respects a custom lead time and tolerates a malformed date", () => {
    expect(isReminderDue(b, 2, at("2026-11-20T03:00:00Z"))).toBe(false); // 4h away, 2h lead
    expect(isReminderDue(b, 2, at("2026-11-20T05:30:00Z"))).toBe(true);
    expect(isReminderDue({ ...b, date: "not-a-date" }, 24, at("2026-11-20T03:00:00Z"))).toBe(false);
  });
  it("reads times as East Africa Time", () => {
    expect(appointmentStartMs(b.date, b.time)).toBe(at("2026-11-20T07:00:00Z"));
  });
});

describe("reminderMessage", () => {
  const base = { full_name: "Amina Wanjiru", email: "amina@example.com", reference: "BK-ABC123", service_name: "Loc retouching", date: "2026-11-20", time: "10:00", location: "salon" };
  it("addresses the customer by first name with the day, time and reference", () => {
    const m = reminderMessage(base);
    expect(m.to).toBe("amina@example.com");
    expect(m.subject).toContain("Friday 20 November");
    expect(m.subject).toContain("10:00");
    expect(m.text).toContain("Hi Amina,");
    expect(m.text).toContain("BK-ABC123");
    expect(m.text).toContain("Loc retouching");
  });
  it("says so for mobile appointments", () => {
    expect(reminderMessage({ ...base, location: "mobile" }).text).toContain("come to you");
  });
});

describe("contactLine / salon number in reminders", () => {
  it("is empty when the owner has set nothing", () => {
    expect(contactLine()).toBe("");
    expect(contactLine({ phone: "", whatsapp: "" })).toBe("");
  });
  it("names the number once when phone and WhatsApp are the same", () => {
    expect(contactLine({ phone: "+254712345678", whatsapp: "0712345678" })).toBe(" You can call or WhatsApp us on +254 712 345 678.");
  });
  it("lists both when they differ, and ignores invalid numbers", () => {
    expect(contactLine({ phone: "+254712345678", whatsapp: "+254733111222" })).toBe(" You can call +254 712 345 678 or WhatsApp +254 733 111 222.");
    expect(contactLine({ phone: "bad" })).toBe("");
  });
  it("is appended to the reminder text only when set", () => {
    const b = { full_name: "Amina W", email: "a@example.com", reference: "BK-1", service_name: "Retouch", date: "2026-12-01", time: "10:00", location: "salon" };
    expect(reminderMessage(b).text).not.toContain("WhatsApp");
    expect(reminderMessage(b, { whatsapp: "0712345678" }).text).toContain("WhatsApp +254 712 345 678");
  });
});
