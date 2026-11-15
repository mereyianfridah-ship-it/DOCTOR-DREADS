import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "../types";
import { useCatalog } from "./CatalogContext";
import { normaliseWishlist, resolveWishlist, toggleSlug } from "../utils/wishlist";
import { readStorage, writeStorage } from "../utils/storage";

const STORAGE_KEY = "drdread.wishlist.v1";

interface WishlistContextValue {
  /** Saved products that still exist in the catalogue, newest first. */
  items: Product[];
  count: number;
  has: (slug: string) => boolean;
  /** Returns true if the product is now saved, false if it was removed. */
  toggle: (slug: string) => boolean;
  remove: (slug: string) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { products, status } = useCatalog();
  const ready = status === "ready";
  const [slugs, setSlugs] = useState<string[]>(() => normaliseWishlist(readStorage<unknown>(STORAGE_KEY, [])));

  useEffect(() => {
    writeStorage(STORAGE_KEY, slugs);
  }, [slugs]);

  // Keep other open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setSlugs(normaliseWishlist(readStorage<unknown>(STORAGE_KEY, [])));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback(
    (slug: string) => {
      const willSave = !slugs.includes(slug);
      setSlugs((prev) => toggleSlug(prev, slug));
      return willSave;
    },
    [slugs],
  );
  const remove = useCallback((slug: string) => setSlugs((prev) => prev.filter((s) => s !== slug)), []);
  const clear = useCallback(() => setSlugs([]), []);

  const items = useMemo(() => (ready ? resolveWishlist(slugs, products) : []), [ready, slugs, products]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      count: ready ? items.length : slugs.length,
      has: (slug) => slugs.includes(slug),
      toggle, remove, clear,
    }),
    [items, ready, slugs, toggle, remove, clear],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within a WishlistProvider");
  return ctx;
}
