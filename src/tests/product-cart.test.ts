import { describe, expect, it } from "vitest";
import type { Product } from "../types";
import { sanitiseCart } from "../utils/cart";
import { categoriesOf, filterProducts, maxQuantity, stockStatus } from "../utils/product";

const p = (slug: string, stock: number, category = "Oils"): Product => ({
  slug, name: slug, category, shortDescription: "", description: "", price: 500, stock, images: [], size: "100ml", status: "active", low_stock_threshold: 5,
});

describe("product helpers", () => {
  it("caps quantity at stock and at 10 per line", () => {
    expect(maxQuantity(p("a", 3))).toBe(3);
    expect(maxQuantity(p("a", 50))).toBe(10);
    expect(maxQuantity(p("a", 0))).toBe(0);
  });
  it("reports stock status", () => {
    expect(stockStatus(p("a", 0))).toEqual({ label: "Out of stock", tone: "out" });
    expect(stockStatus(p("a", 2))).toEqual({ label: "Only 2 left", tone: "low" });
    expect(stockStatus(p("a", 20))).toEqual({ label: "In stock", tone: "ok" });
  });
  it("derives unique sorted categories", () => {
    expect(categoriesOf([p("a", 1, "Oils"), p("b", 1, "Gels"), p("c", 1, "Oils")])).toEqual(["Gels", "Oils"]);
  });
});

describe("sanitiseCart", () => {
  const products = [p("oil", 4), p("gel", 50), p("sold-out", 0)];
  it("drops unknown and sold-out products", () => {
    const out = sanitiseCart([{ productId: "ghost", quantity: 1 }, { productId: "sold-out", quantity: 1 }, { productId: "oil", quantity: 1 }], products);
    expect(out).toEqual([{ productId: "oil", quantity: 1 }]);
  });
  it("clamps quantities to stock and the per-line limit and repairs bad values", () => {
    const out = sanitiseCart([{ productId: "oil", quantity: 9 }, { productId: "gel", quantity: 99 }], products);
    expect(out).toEqual([{ productId: "oil", quantity: 4 }, { productId: "gel", quantity: 10 }]);
    expect(sanitiseCart([{ productId: "oil", quantity: -3 }], products)).toEqual([{ productId: "oil", quantity: 1 }]);
    expect(sanitiseCart([{ productId: "oil", quantity: Number.NaN }], products)).toEqual([{ productId: "oil", quantity: 1 }]);
    expect(sanitiseCart([{ productId: "oil", quantity: 2.9 }], products)).toEqual([{ productId: "oil", quantity: 2 }]);
  });
  it("returns an empty cart for non-array input", () => {
    expect(sanitiseCart("garbage", products)).toEqual([]);
    expect(sanitiseCart(null, products)).toEqual([]);
  });
});

describe("filterProducts", () => {
  const base = { query: "", category: "", inStockOnly: false, sort: "featured" as const };
  const items = [
    { ...p("a", 0, "Oils"), name: "Coconut Oil", price: 600 },
    { ...p("b", 5, "Oils"), name: "Castor Oil", price: 900 },
    { ...p("c", 9, "Gels"), name: "Moulding Gel", price: 1500 },
  ];
  it("matches every search word in any order", () => {
    expect(filterProducts(items, { ...base, query: "oil coconut" }).map((x) => x.slug)).toEqual(["a"]);
  });
  it("filters by stock and price bounds", () => {
    expect(filterProducts(items, { ...base, inStockOnly: true }).map((x) => x.slug)).toEqual(["b", "c"]);
    expect(filterProducts(items, { ...base, minPrice: 800, maxPrice: 1200 }).map((x) => x.slug)).toEqual(["b"]);
  });
  it("sorts by price descending", () => {
    expect(filterProducts(items, { ...base, sort: "price-desc" }).map((x) => x.slug)).toEqual(["c", "b", "a"]);
  });
});
