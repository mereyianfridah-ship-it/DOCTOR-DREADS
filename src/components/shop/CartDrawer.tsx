import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingBag, X } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { formatKSh } from "../../utils/format";
import { Button } from "../common/Button";
import { EmptyState } from "../common/EmptyState";
import { CartItem } from "./CartItem";

export function CartDrawer() {
  const { drawerOpen, closeDrawer, lines, subtotal, itemCount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  const go = (path: string) => {
    closeDrawer();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <div className="absolute inset-0 animate-fade-in bg-charcoal/60" onClick={closeDrawer} aria-hidden />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in flex-col bg-offwhite shadow-2xl">
        <header className="flex items-center justify-between border-b border-charcoal/10 px-6 py-4">
          <h2 className="text-2xl">Your Cart ({itemCount})</h2>
          <button type="button" onClick={closeDrawer} aria-label="Close cart" className="rounded-full p-2 hover:bg-charcoal/10">
            <X className="h-5 w-5" />
          </button>
        </header>

        {lines.length === 0 ? (
          <div className="flex flex-1 items-center">
            <EmptyState
              icon={<ShoppingBag className="h-7 w-7" />}
              title="Your cart is empty"
              description="Browse the shop and add something you like."
              action={<Button onClick={() => go("/shop")}>Continue Shopping</Button>}
            />
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-charcoal/10 overflow-y-auto px-6">
              {lines.map((l) => (
                <CartItem key={l.product.slug} line={l} compact />
              ))}
            </ul>
            <footer className="border-t border-charcoal/10 bg-white px-6 py-5">
              <div className="flex items-center justify-between text-lg">
                <span>Subtotal</span>
                <span className="font-bold">{formatKSh(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-charcoal/60">Delivery is calculated at checkout.</p>
              <div className="mt-4 grid gap-2">
                <Button fullWidth onClick={() => go("/checkout")}>
                  Proceed to Checkout
                </Button>
                <Button fullWidth variant="outline" onClick={() => go("/cart")}>
                  View Cart
                </Button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
