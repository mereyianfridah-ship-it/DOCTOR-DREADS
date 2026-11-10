import { ShoppingBag } from "lucide-react";
import { ButtonLink } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { CartItem } from "../components/shop/CartItem";
import { useCart } from "../context/CartContext";
import { formatKSh } from "../utils/format";

export default function Cart() {
  const { lines, subtotal, itemCount, clear } = useCart();
  return (
    <>
      <PageHeader title="Your Cart" />
      <section className="section">
        <div className="container-page">
          {lines.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-7 w-7" />}
              title="Your cart is empty"
              description="Looks like you haven't added anything yet."
              action={<ButtonLink to="/shop">Continue Shopping</ButtonLink>}
            />
          ) : (
            <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
              <div>
                <ul className="divide-y divide-charcoal/10 border-y border-charcoal/10">
                  {lines.map((l) => <CartItem key={l.product.slug} line={l} />)}
                </ul>
                <div className="mt-6 flex flex-wrap justify-between gap-3">
                  <ButtonLink to="/shop" variant="outline">Continue Shopping</ButtonLink>
                  <button type="button" onClick={clear} className="text-sm text-charcoal/60 underline hover:text-red-700">Clear cart</button>
                </div>
              </div>
              <aside className="h-fit rounded-2xl border border-charcoal/10 bg-white p-6">
                <h2 className="text-2xl">Order summary</h2>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between"><dt>Items</dt><dd>{itemCount}</dd></div>
                  <div className="flex justify-between"><dt>Subtotal</dt><dd className="font-semibold">{formatKSh(subtotal)}</dd></div>
                  <div className="flex justify-between text-charcoal/60"><dt>Delivery</dt><dd>Calculated at checkout</dd></div>
                </dl>
                <div className="mt-5 flex justify-between border-t border-charcoal/10 pt-5 text-lg font-bold">
                  <span>Total</span><span>{formatKSh(subtotal)}</span>
                </div>
                <ButtonLink to="/checkout" size="lg" fullWidth className="mt-6">Proceed to Checkout</ButtonLink>
              </aside>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
