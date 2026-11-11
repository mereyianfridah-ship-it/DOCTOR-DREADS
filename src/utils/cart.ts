import type { CartLine, Product } from "../types";
import { maxQuantity } from "./product";

/** Drops unknown/sold-out products and clamps quantities to valid, stock-aware integers. */
export function sanitiseCart(raw: unknown, products: Product[]): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const l of raw as CartLine[]) {
    const p = l && typeof l.productId === "string" ? products.find((x) => x.slug === l.productId) : undefined;
    if (!p || p.stock === 0) continue;
    const q = Math.min(maxQuantity(p), Math.max(1, Math.floor(Number(l.quantity) || 1)));
    out.push({ productId: p.slug, quantity: q });
  }
  return out;
}
