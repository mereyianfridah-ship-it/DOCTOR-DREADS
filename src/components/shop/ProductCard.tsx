import { ProductImage } from "../common/ProductImage";
import { Link } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "../../types";
import { stockStatus } from "../../utils/product";
import { formatKSh } from "../../utils/format";
import { useCart } from "../../context/CartContext";
import { Button, ButtonLink } from "../common/Button";

const tone = { ok: "text-olive", low: "text-brown", out: "text-red-700" } as const;

export function ProductCard({ product }: { product: Product }) {
  const { addItem, openDrawer } = useCart();
  const status = stockStatus(product);

  const handleAdd = () => {
    const res = addItem(product.slug, 1);
    if (res.ok) {
      toast.success(`${product.name} added to cart`);
      openDrawer();
    } else {
      toast.error(res.message ?? "Could not add to cart");
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <Link to={`/shop/${product.slug}`} className="relative block aspect-square overflow-hidden bg-cream" aria-label={`View ${product.name}`}>
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          category={product.category}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3">
          {product.status === "archived" && (
            <span className="text-xs text-gray-500">Archived</span>
          )}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-brown">{product.category}</p>
        <h3 className="mt-1 text-xl leading-snug">
          <Link to={`/shop/${product.slug}`} className="hover:text-brown">
            {product.name}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm text-charcoal/70">{product.shortDescription}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-bold">{formatKSh(product.price)}</span>
          <span className={`text-xs font-semibold ${tone[status.tone]}`}>{status.label}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <ButtonLink to={`/shop/${product.slug}`} variant="outline" size="sm">
            View
          </ButtonLink>
          <Button size="sm" variant="secondary" onClick={handleAdd} disabled={product.stock === 0}>
            <ShoppingBag className="h-4 w-4" aria-hidden />
            {product.stock === 0 ? "Sold out" : "Add"}
          </Button>
        </div>
      </div>
    </article>
  );
}
