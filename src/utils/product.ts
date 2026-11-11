import type { Product } from "../types";

export const MAX_QTY_PER_LINE = 10; // matches the backend limit
export const maxQuantity = (p: Product) => Math.min(p.stock, MAX_QTY_PER_LINE);
export const stockStatus = (p: Product): { label: string; tone: "ok" | "low" | "out" } =>
  p.stock === 0
    ? { label: "Out of stock", tone: "out" }
    : p.stock <= 5
      ? { label: `Only ${p.stock} left`, tone: "low" }
      : { label: "In stock", tone: "ok" };

/** Unique, sorted category names from a list of items. */
export const categoriesOf = (items: { category: string }[]): string[] => [...new Set(items.map((i) => i.category))].sort();
