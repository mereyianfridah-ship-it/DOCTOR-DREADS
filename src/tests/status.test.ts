import { describe, expect, it } from "vitest";
import { bookingStatusInfo, consultationCustomerMessage, consultationStatusInfo, consultationStepIndex, consultationSteps, formatCountdown, orderStatusInfo, remainingSeconds } from "../utils/status";

describe("hold countdown", () => {
  const now = Date.parse("2026-11-11T10:00:00.000Z");
  it("counts down to the expiry", () => {
    expect(remainingSeconds("2026-11-11T10:10:00.000Z", now)).toBe(600);
    expect(remainingSeconds("2026-11-11T10:00:30.500Z", now)).toBe(30);
  });
  it("never goes negative and tolerates missing or invalid values", () => {
    expect(remainingSeconds("2026-11-11T09:00:00.000Z", now)).toBe(0);
    expect(remainingSeconds(null, now)).toBe(0);
    expect(remainingSeconds(undefined, now)).toBe(0);
    expect(remainingSeconds("not a date", now)).toBe(0);
  });
  it("formats as m:ss", () => {
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(65)).toBe("1:05");
    expect(formatCountdown(0)).toBe("0:00");
  });
});

describe("status labels", () => {
  it("labels the shared 'shipped' state by fulfilment method", () => {
    expect(orderStatusInfo("shipped", "collection").label).toBe("Ready for collection");
    expect(orderStatusInfo("shipped", "delivery").label).toBe("Out for delivery");
  });
  it("never presents an unpaid order as paid", () => {
    expect(orderStatusInfo("pending_payment").label).toBe("Pending payment");
    expect(orderStatusInfo("expired").tone).toBe("grey");
  });
  it("covers every booking and consultation status", () => {
    expect(Object.keys(bookingStatusInfo).sort()).toEqual(["cancelled", "completed", "confirmed", "expired", "pending_deposit"]);
    expect(Object.keys(consultationStatusInfo).sort()).toEqual(["closed", "contacted", "new", "quoted"]);
    expect(bookingStatusInfo.pending_deposit.label).toBe("Awaiting deposit");
  });
});

describe("consultation progress (customer view)", () => {
  it("maps each status to a step", () => {
    expect(consultationStepIndex("new")).toBe(0);
    expect(consultationStepIndex("contacted")).toBe(1);
    expect(consultationStepIndex("quoted")).toBe(2);
  });
  it("treats a closed request as having completed every step", () => {
    expect(consultationStepIndex("closed")).toBe(consultationSteps.length - 1);
  });
  it("has customer-facing copy for every status and never promises automatic booking or payment", () => {
    for (const s of Object.keys(consultationStatusInfo) as (keyof typeof consultationStatusInfo)[]) {
      expect(consultationCustomerMessage[s].length).toBeGreaterThan(10);
    }
    expect(consultationCustomerMessage.quoted).toMatch(/nothing is booked or charged automatically/i);
  });
});
