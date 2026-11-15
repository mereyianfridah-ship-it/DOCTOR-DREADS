import { describe, expect, it } from "vitest";
import { refundQuote } from "../src/lib/refund.js";

const policy = { fullHours: 48, partialHours: 24, partialPercent: 50 };
// 2026-11-20 10:00 EAT = 07:00 UTC
const b = { status: "confirmed", date: "2026-11-20", time: "10:00", deposit_amount: 1000 };
const at = (iso: string) => Date.parse(iso);

describe("refundQuote", () => {
  it("refunds in full with enough notice", () => {
    const q = refundQuote(b, policy, at("2026-11-18T07:00:00Z")); // exactly 48h
    expect(q).toMatchObject({ amount: 1000, percent: 100, tier: "full" });
  });
  it("refunds a share inside the partial window", () => {
    expect(refundQuote(b, policy, at("2026-11-19T07:00:00Z"))).toMatchObject({ amount: 500, tier: "partial" }); // 24h
    expect(refundQuote({ ...b, deposit_amount: 999 }, policy, at("2026-11-19T20:00:00Z")).amount).toBe(499); // rounds down
  });
  it("forfeits the deposit with short notice or after the start", () => {
    expect(refundQuote(b, policy, at("2026-11-20T03:00:00Z"))).toMatchObject({ amount: 0, tier: "none" });
    expect(refundQuote(b, policy, at("2026-11-21T00:00:00Z")).amount).toBe(0);
  });
  it("has nothing to refund when no deposit was paid", () => {
    expect(refundQuote({ ...b, status: "pending_deposit" }, policy, at("2026-11-10T00:00:00Z"))).toMatchObject({ amount: 0, tier: "not_paid" });
  });
  it("drops the partial tier when it is set to 0%", () => {
    expect(refundQuote(b, { ...policy, partialPercent: 0 }, at("2026-11-19T07:00:00Z")).tier).toBe("none");
  });
});
