import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CartLine, Product } from "../types";
import { getProduct, maxQuantity } from "../data/products";
import { readStorage, writeStorage } from "../utils/storage";

const STORAGE_KEY = "drdread.cart.v1";

export interface DetailedLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

interface CartContextValue {
  lines: DetailedLine[];
  itemCount: number;
  subtotal: number;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (slug: string, quantity?: number) => { ok: boolean; message?: string };
  removeItem: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/** Drops unknown products and clamps quantities to valid integers (stock-aware). */
function sanitise(raw: CartLine[]): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const l of raw) {
    const p = l && typeof l.productId === "string" ? getProduct(l.productId) : undefined;
    if (!p || p.stock === 0) continue;
    const q = Math.min(maxQuantity(p), Math.max(1, Math.floor(Number(l.quantity) || 1)));
    out.push({ productId: p.slug, quantity: q });
  }
  return out;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartLine[]>(() => sanitise(readStorage<CartLine[]>(STORAGE_KEY, [])));
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    writeStorage(STORAGE_KEY, cart);
  }, [cart]);

  const addItem = useCallback((slug: string, quantity = 1) => {
    const p = getProduct(slug);
    if (!p) return { ok: false, message: "Product not found" };
    if (p.stock === 0) return { ok: false, message: "This product is out of stock" };
    const limit = maxQuantity(p);
    let message: string | undefined;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === slug);
      const current = existing ? existing.quantity : 0;
      const next = Math.min(limit, current + Math.max(1, Math.floor(quantity)));
      if (next === current) message = `Maximum quantity (${limit}) reached`;
      return existing
        ? prev.map((l) => (l.productId === slug ? { ...l, quantity: next } : l))
        : [...prev, { productId: slug, quantity: next }];
    });
    return { ok: !message, message };
  }, []);

  const removeItem = useCallback((slug: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== slug));
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    const p = getProduct(slug);
    if (!p) return;
    const q = Math.floor(quantity);
    if (!Number.isFinite(q) || q < 1) return; // invalid quantities are ignored; use removeItem
    setCart((prev) =>
      prev.map((l) => (l.productId === slug ? { ...l, quantity: Math.min(maxQuantity(p), q) } : l)),
    );
  }, []);

  const clear = useCallback(() => setCart([]), []);

  const lines = useMemo<DetailedLine[]>(
    () =>
      cart.flatMap((l) => {
        const product = getProduct(l.productId);
        return product
          ? [{ product, quantity: l.quantity, lineTotal: product.price * l.quantity }]
          : [];
      }),
    [cart],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem,
      removeItem,
      setQuantity,
      clear,
    }),
    [lines, drawerOpen, addItem, removeItem, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
