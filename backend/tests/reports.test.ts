import { describe, expect, it } from "vitest";
import { fillDays, parseRange, pct } from "../src/lib/reports.js";

describe("parseRange", () => {
  it("defaults to the last 30 days", () => {
    expect(parseRange(undefined, undefined, "2026-11-15")).toEqual({ from: "2026-10-17", to: "2026-11-15" });
  });
  it("swaps reversed dates and ignores junk", () => {
    expect(parseRange("2026-11-10", "2026-11-01", "2026-11-15")).toEqual({ from: "2026-11-01", to: "2026-11-10" });
    expect(parseRange("nope", "2026-11-10", "2026-11-15")).toEqual({ from: "2026-10-12", to: "2026-11-10" });
  });
  it("caps the span at a year", () => {
    expect(parseRange("2020-01-01", "2026-11-15", "2026-11-15").from).toBe("2025-11-15");
  });
});

describe("fillDays / pct", () => {
  it("fills missing days with zeros", () => {
    const rows = fillDays({ from: "2026-11-01", to: "2026-11-03" }, [{ day: "2026-11-02", revenue: 500 }], { revenue: 0 });
    expect(rows).toEqual([{ day: "2026-11-01", revenue: 0 }, { day: "2026-11-02", revenue: 500 }, { day: "2026-11-03", revenue: 0 }]);
  });
  it("computes a safe percentage", () => {
    expect(pct(1, 3)).toBe(33.3);
    expect(pct(1, 0)).toBe(0);
  });
});
