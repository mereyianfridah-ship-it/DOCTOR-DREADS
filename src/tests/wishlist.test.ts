import { describe, expect, it } from "vitest";
import type { Product } from "../types";
import { WISHLIST_LIMIT, normaliseWishlist, resolveWishlist, toggleSlug } from "../utils/wishlist";

const p = (slug: string, status: Product["status"] = "active"): Product => ({
  slug, name: slug, category: "Oils", shortDescription: "", description: "", price: 500, stock: 5, images: [], size: "100ml",
  status, low_stock_threshold: 3,
});

describe("normaliseWishlist", () => {
  it("rejects non-arrays and drops junk and duplicates", () => {
    expect(normaliseWishlist("x")).toEqual([]);
    expect(normaliseWishlist(null)).toEqual([]);
    expect(normaliseWishlist(["a", "a", 3, "", "  ", null, "b"])).toEqual(["a", "b"]);
  });
  it("caps the list length", () => {
    const big = Array.from({ length: WISHLIST_LIMIT + 20 }, (_, i) => `s${i}`);
    expect(normaliseWishlist(big)).toHaveLength(WISHLIST_LIMIT);
  });
});

describe("toggleSlug", () => {
  it("adds newest first and removes when present", () => {
    expect(toggleSlug(["a"], "b")).toEqual(["b", "a"]);
    expect(toggleSlug(["b", "a"], "b")).toEqual(["a"]);
  });
});

describe("resolveWishlist", () => {
  it("keeps saved order and drops unknown or archived products", () => {
    const products = [p("a"), p("b"), p("c", "archived")];
    expect(resolveWishlist(["b", "ghost", "c", "a"], products).map((x) => x.slug)).toEqual(["b", "a"]);
  });
});
