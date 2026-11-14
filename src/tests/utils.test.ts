import { describe, expect, it } from "vitest";
import { formatBytes, formatKSh } from "../utils/format";
import { parseWhole } from "../utils/numbers";
import { safeRedirect } from "../utils/redirect";
import { looksLikeEmailOrPhone } from "../utils/validation";

describe("money and sizes", () => {
  it("formats whole KSh amounts", () => {
    expect(formatKSh(1500)).toBe("KSh 1,500");
    expect(formatKSh(0)).toBe("KSh 0");
    expect(formatKSh(1499.6)).toBe("KSh 1,500");
  });
  it("formats byte sizes", () => {
    expect(formatBytes(512)).toBe("1 KB");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("parseWhole (integer KSh / stock fields)", () => {
  it("accepts non-negative whole numbers", () => {
    expect(parseWhole("0")).toBe(0);
    expect(parseWhole(" 1200 ")).toBe(1200);
  });
  it("rejects decimals, negatives, blanks and text", () => {
    for (const bad of ["", "  ", "12.5", "-3", "1e3", "abc", "1,200", "٣"]) expect(parseWhole(bad)).toBeNull();
  });
  it("rejects numbers beyond safe integer range", () => {
    expect(parseWhole("9007199254740993")).toBeNull();
  });
});

describe("safeRedirect (post-login destination)", () => {
  it("allows same-site paths", () => {
    expect(safeRedirect("/account/orders")).toBe("/account/orders");
    expect(safeRedirect("/admin?x=1")).toBe("/admin?x=1");
  });
  it("blocks external, protocol-relative and malformed destinations", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "", undefined, 42, null]) {
      expect(safeRedirect(bad)).toBe("/account");
    }
  });
});

describe("looksLikeEmailOrPhone (guest consultation lookup)", () => {
  it("accepts emails and phone numbers in common Kenyan formats", () => {
    for (const v of ["amina@example.com", " amina@example.com ", "0712345678", "+254 712 345 678", "0712-345-678"]) expect(looksLikeEmailOrPhone(v)).toBe(true);
  });
  it("rejects empty, too-short and malformed values", () => {
    for (const v of ["", "   ", "amina", "amina@", "12345", "not a phone"]) expect(looksLikeEmailOrPhone(v)).toBe(false);
  });
});
