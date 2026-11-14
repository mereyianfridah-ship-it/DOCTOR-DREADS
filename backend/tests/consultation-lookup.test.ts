import { describe, expect, it, vi } from "vitest";

// Pure-logic tests: no database needed. Cloudinary is mocked so importing the route never needs credentials.
vi.mock("../src/lib/cloudinary.js", () => ({ uploadImage: vi.fn(), isCloudinaryConfigured: true }));

const { samePhone, contactMatches, consultationPublicView } = await import("../src/routes/consultations.js");

describe("samePhone", () => {
  it("matches the same number written in different Kenyan formats", () => {
    expect(samePhone("0712345678", "+254712345678")).toBe(true);
    expect(samePhone("0712 345 678", "712345678")).toBe(true);
    expect(samePhone("+254 712-345-678", "0712345678")).toBe(true);
  });
  it("rejects different numbers and values too short to be a phone", () => {
    expect(samePhone("0712345678", "0712345679")).toBe(false);
    expect(samePhone("0712345678", "12345")).toBe(false);
    expect(samePhone("", "")).toBe(false);
  });
});

describe("contactMatches", () => {
  const c = { email: "Amina@Example.com", phone: "0712345678" };
  it("accepts the email (case-insensitive) or the phone", () => {
    expect(contactMatches(c, "amina@example.com")).toBe(true);
    expect(contactMatches(c, " +254712345678 ")).toBe(true);
  });
  it("rejects missing, empty and wrong contacts", () => {
    expect(contactMatches(c, undefined)).toBe(false);
    expect(contactMatches(c, "")).toBe(false);
    expect(contactMatches(c, "other@example.com")).toBe(false);
    expect(contactMatches(c, ["amina@example.com"])).toBe(false);
  });
  it("does not let an empty stored email match an empty query", () => {
    expect(contactMatches({ email: "", phone: "0712345678" }, "")).toBe(false);
  });
});

describe("consultationPublicView", () => {
  const row = { reference: "CON-ABC234", status: "quoted", created_at: "2026-11-01T10:00:00.000Z", hair_condition: "Natural", hair_length: "Short", loc_size: "Medium", install_type: "Starter locs", info: "Hi",
    full_name: "Amina", phone: "0712345678", email: "a@b.co", user_id: 7, marketing_consent: 1, quotation_amount: 8500, quotation_note: "Includes consultation", quoted_at: "2026-11-02T08:00:00.000Z" };
  it("never exposes contact details or internal ids", () => {
    const v = consultationPublicView(row, 3) as Record<string, unknown>;
    for (const k of ["fullName", "phone", "email", "userId", "user_id", "marketingConsent"]) expect(v).not.toHaveProperty(k);
    expect(JSON.stringify(v)).not.toContain("0712345678");
    expect(v.photos).toBe(3);
  });
  it("includes the quotation only once one exists", () => {
    expect(consultationPublicView(row, 0).quotation).toMatchObject({ amount: 8500, note: "Includes consultation", quotedAt: "2026-11-02T08:00:00.000Z" });
    expect(consultationPublicView({ ...row, quotation_amount: null }, 0).quotation).toBeNull();
  });
  it("exposes the customer's response only when there is one", () => {
    expect(consultationPublicView(row, 0).quotation).toMatchObject({ response: null, respondedAt: null });
    const answered = consultationPublicView({ ...row, quotation_response: "accepted", quotation_responded_at: "2026-11-03T09:00:00.000Z" }, 0);
    expect(answered.quotation).toMatchObject({ response: "accepted", respondedAt: "2026-11-03T09:00:00.000Z" });
  });
});
