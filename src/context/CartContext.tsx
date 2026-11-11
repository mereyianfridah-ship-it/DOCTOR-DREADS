import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CartLine, Product } from "../types";
import { useCatalog } from "./CatalogContext";
import { sanitiseCart } from "../utils/cart";
import { maxQuantity } from "../utils/product";
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
  /** false until the product list has loaded (prices and stock come from the API). */
  ready: boolean;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  addItem: (slug: string, quantity?: number) => { ok: boolean; message?: string };
  removeItem: (slug: string) => void;
  setQuantity: (slug: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { products, status, getProduct } = useCatalog();
  const ready = status === "ready";
  const [cart, setCart] = useState<CartLine[]>(() => {
    const raw = readStorage<CartLine[]>(STORAGE_KEY, []);
    return Array.isArray(raw) ? raw.filter((l) => l && typeof l.productId === "string") : [];
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const getProductRef = useRef(getProduct);
  getProductRef.current = getProduct;

  // Once real products have loaded, reconcile the stored cart with current stock (never before: that would wipe it).
  useEffect(() => {
    if (ready) setCart((prev) => sanitiseCart(prev, products));
  }, [ready, products]);

  useEffect(() => {
    if (ready) writeStorage(STORAGE_KEY, cart);
  }, [cart, ready]);

  const addItem = useCallback((slug: string, quantity = 1) => {
    const p = getProductRef.current(slug);
    if (!p) return { ok: false, message: "Product not found" };
    if (p.stock === 0) return { ok: false, message: "This product is out of stock" };
    const limit = maxQuantity(p);
    const current = cart.find((l) => l.productId === slug)?.quantity ?? 0;
    const next = Math.min(limit, current + Math.max(1, Math.floor(quantity)));
    if (next === current) return { ok: false, message: `Maximum quantity (${limit}) reached` };
    setCart((prev) =>
      prev.some((l) => l.productId === slug)
        ? prev.map((l) => (l.productId === slug ? { ...l, quantity: next } : l))
        : [...prev, { productId: slug, quantity: next }],
    );
    return { ok: true };
  }, [cart]);

  const removeItem = useCallback((slug: string) => setCart((prev) => prev.filter((l) => l.productId !== slug)), []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    const p = getProductRef.current(slug);
    if (!p) return;
    const q = Math.floor(quantity);
    if (!Number.isFinite(q) || q < 1) return; // invalid quantities are ignored; use removeItem
    setCart((prev) => prev.map((l) => (l.productId === slug ? { ...l, quantity: Math.min(maxQuantity(p), q) } : l)));
  }, []);

  const clear = useCallback(() => setCart([]), []);

  const lines = useMemo<DetailedLine[]>(
    () =>
      cart.flatMap((l) => {
        const product = products.find((p) => p.slug === l.productId);
        return product ? [{ product, quantity: l.quantity, lineTotal: product.price * l.quantity }] : [];
      }),
    [cart, products],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      itemCount: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((n, l) => n + l.lineTotal, 0),
      ready,
      drawerOpen,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      addItem, removeItem, setQuantity, clear,
    }),
    [lines, ready, drawerOpen, addItem, removeItem, setQuantity, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
