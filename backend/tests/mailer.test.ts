import { describe, expect, it } from "vitest";
import { isMailConfigured, sendMail, testOutbox } from "../src/lib/mailer.js";

describe("mailer (test mode)", () => {
  it("records messages instead of sending them", async () => {
    const before = testOutbox.length;
    expect(await sendMail({ to: "a@example.com", subject: "Hi", text: "Body" })).toBe(true);
    expect(testOutbox).toHaveLength(before + 1);
    expect(testOutbox.at(-1)).toMatchObject({ to: "a@example.com", subject: "Hi" });
  });
  it("reports unconfigured when no Resend credentials are set", () => {
    expect(isMailConfigured()).toBe(false);
  });
});
