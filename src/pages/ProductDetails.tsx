import { ProductImage } from "../components/common/ProductImage";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/common/Button";
import { SectionHeading } from "../components/common/SectionHeading";
import { ProductGrid } from "../components/shop/ProductGrid";
import { QuantitySelector } from "../components/shop/QuantitySelector";
import { useCart } from "../context/CartContext";
import { QueryState } from "../components/common/QueryState";
import { useCatalog } from "../context/CatalogContext";
import { maxQuantity, stockStatus } from "../utils/product";
import { formatKSh } from "../utils/format";
import NotFound from "./NotFound";

export default function ProductDetails() {
  const { slug = "" } = useParams();
  const { status, error, reload, getProduct } = useCatalog();
  if (status !== "ready") return <QueryState loading={status === "loading"} error={error} onRetry={() => void reload()}><></></QueryState>;
  const product = getProduct(slug);
  // key by slug so state resets when navigating between products
  return product ? <ProductView key={product.slug} slug={slug} /> : <NotFound />;
}

function ProductView({ slug }: { slug: string }) {
  const { products, getProduct } = useCatalog();
  const product = getProduct(slug)!;
  const { addItem, openDrawer } = useCart();
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const status = stockStatus(product);
  const related = [
    ...products.filter((p) => p.slug !== product.slug && p.category === product.category),
    ...products.filter((p) => p.slug !== product.slug && p.category !== product.category),
  ].slice(0, 4);

  const handleAdd = () => {
    const res = addItem(product.slug, qty);
    if (res.ok) {
      toast.success(`${qty} × ${product.name} added to cart`);
      openDrawer();
    } else toast.error(res.message ?? "Could not add to cart");
  };

  return (
    <>
      <section className="section">
        <div className="container-page">
          <Link to="/shop" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-brown hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to shop
          </Link>
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <ProductImage src={product.images[imgIndex]} alt={product.name} loading="eager" className="aspect-square w-full rounded-2xl object-cover" />
              {product.images.length > 1 && (
                <div className="mt-4 flex gap-3">
                  {product.images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setImgIndex(i)}
                      aria-label={`Show image ${i + 1}`}
                      aria-pressed={i === imgIndex}
                      className={`h-20 w-20 overflow-hidden rounded-lg border-2 ${i === imgIndex ? "border-gold" : "border-transparent"}`}
                    >
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brown">{product.category}</p>
              <h1 className="mt-2 text-4xl sm:text-5xl">{product.name}</h1>
              <p className="mt-4 text-3xl font-bold">{formatKSh(product.price)}</p>
              <p className="mt-1 text-sm text-charcoal/60">{product.size} · sample price</p>
              <p className={`mt-3 text-sm font-semibold ${status.tone === "out" ? "text-red-700" : status.tone === "low" ? "text-brown" : "text-olive"}`}>{status.label}</p>
              <p className="mt-6 text-lg leading-relaxed text-charcoal/75">{product.description}</p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <QuantitySelector value={qty} max={Math.max(1, maxQuantity(product))} onChange={setQty} />
                <Button size="lg" onClick={handleAdd} disabled={product.stock === 0}>
                  <ShoppingBag className="h-5 w-5" aria-hidden />
                  {product.stock === 0 ? "Out of stock" : "Add to Cart"}
                </Button>
              </div>
              
            </div>
          </div>
        </div>
      </section>
      <section className="section bg-cream/50">
        <div className="container-page">
          <SectionHeading eyebrow="Related" title="You may also like" />
          <div className="mt-12"><ProductGrid products={related} /></div>
        </div>
      </section>
    </>
  );
}
