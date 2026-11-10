import { Link } from "react-router-dom";
import { Trash2 } from "lucide-react";
import type { DetailedLine } from "../../context/CartContext";
import { useCart } from "../../context/CartContext";
import { maxQuantity } from "../../data/products";
import { formatKSh } from "../../utils/format";
import { QuantitySelector } from "./QuantitySelector";

export function CartItem({ line, compact }: { line: DetailedLine; compact?: boolean }) {
  const { setQuantity, removeItem, closeDrawer } = useCart();
  const { product, quantity, lineTotal } = line;
  return (
    <li className="flex gap-4 py-5">
      <Link
        to={`/shop/${product.slug}`}
        onClick={closeDrawer}
        className={`shrink-0 overflow-hidden rounded-lg bg-cream ${compact ? "h-20 w-20" : "h-24 w-24 sm:h-28 sm:w-28"}`}
      >
        <img src={product.images[0]} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/shop/${product.slug}`} onClick={closeDrawer} className="block truncate font-display text-lg hover:text-brown">
              {product.name}
            </Link>
            <p className="text-sm text-charcoal/60">
              {formatKSh(product.price)} · {product.size}
            </p>
          </div>
          <p className="shrink-0 font-bold">{formatKSh(lineTotal)}</p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <QuantitySelector
            value={quantity}
            max={maxQuantity(product)}
            onChange={(q) => setQuantity(product.slug, q)}
            label={`Quantity for ${product.name}`}
          />
          <button
            type="button"
            onClick={() => removeItem(product.slug)}
            className="inline-flex items-center gap-1 text-sm text-charcoal/60 hover:text-red-700"
            aria-label={`Remove ${product.name} from cart`}
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        </div>
      </div>
    </li>
  );
}
