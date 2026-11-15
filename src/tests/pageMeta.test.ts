import { describe, expect, it } from "vitest";
import { isPrivatePath, titleForPath } from "../utils/pageMeta";

describe("page meta", () => {
  it("titles static routes and ignores trailing slashes", () => {
    expect(titleForPath("/shop")).toBe("Shop hair-care essentials | Dr Dread Kenya");
    expect(titleForPath("/contact/")).toBe("Contact us | Dr Dread Kenya");
  });
  it("leaves detail and unknown routes to their own pages", () => {
    expect(titleForPath("/shop/coconut-oil")).toBeNull();
    expect(titleForPath("/")).toBeNull();
  });
  it("marks account, checkout and status pages as noindex", () => {
    for (const p of ["/admin/orders", "/account", "/checkout", "/orders/ABC123", "/bookings/XYZ"]) expect(isPrivatePath(p)).toBe(true);
    for (const p of ["/", "/shop", "/shop/oil", "/services/locs", "/about"]) expect(isPrivatePath(p)).toBe(false);
  });
});
