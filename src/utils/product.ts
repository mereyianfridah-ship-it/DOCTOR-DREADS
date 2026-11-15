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

export type ShopSort = "featured" | "price-asc" | "price-desc" | "name";

export interface ShopFilters {
  query: string;
  category: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly: boolean;
  sort: ShopSort;
}

/**
 * Filters and sorts the catalogue. Search is token-based: every word typed must
 * appear somewhere in the name, description, category or size, in any order
 * ("coconut oil" matches "Oil – Coconut").
 */
export function filterProducts(products: Product[], f: ShopFilters): Product[] {
  const tokens = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const list = products.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.inStockOnly && p.stock <= 0) return false;
    if (f.minPrice !== undefined && p.price < f.minPrice) return false;
    if (f.maxPrice !== undefined && p.price > f.maxPrice) return false;
    if (!tokens.length) return true;
    const haystack = `${p.name} ${p.shortDescription} ${p.category} ${p.size}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
  if (f.sort === "price-asc") list.sort((a, b) => a.price - b.price);
  else if (f.sort === "price-desc") list.sort((a, b) => b.price - a.price);
  else if (f.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  return list;
}
