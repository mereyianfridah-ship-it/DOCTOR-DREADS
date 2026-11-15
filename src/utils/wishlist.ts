import type { Product } from "../types";

/** Cap so a corrupted or abused localStorage value can't grow without bound. */
export const WISHLIST_LIMIT = 100;

/** Keeps only unique, non-empty string slugs (repairs whatever was in storage). */
export function normaliseWishlist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (typeof v === "string" && v.trim() && !seen.has(v)) seen.add(v);
    if (seen.size >= WISHLIST_LIMIT) break;
  }
  return [...seen];
}

/** Adds the slug (newest first) or removes it if already present. */
export function toggleSlug(list: string[], slug: string): string[] {
  if (list.includes(slug)) return list.filter((s) => s !== slug);
  return [slug, ...list].slice(0, WISHLIST_LIMIT);
}

/** Resolves saved slugs to live products, preserving saved order and dropping removed/archived ones. */
export function resolveWishlist(slugs: string[], products: Product[]): Product[] {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  return slugs.flatMap((s) => {
    const p = bySlug.get(s);
    return p && p.status !== "archived" ? [p] : [];
  });
}
