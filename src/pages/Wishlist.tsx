import { Heart } from "lucide-react";
import { ButtonLink } from "../components/common/Button";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { QueryState } from "../components/common/QueryState";
import { ProductGrid } from "../components/shop/ProductGrid";
import { useCatalog } from "../context/CatalogContext";
import { useWishlist } from "../context/WishlistContext";

export default function Wishlist() {
  const { status, error, reload } = useCatalog();
  const { items, clear } = useWishlist();

  if (status !== "ready") {
    return <QueryState loading={status === "loading"} error={error} onRetry={() => void reload()}><></></QueryState>;
  }

  return (
    <>
      <PageHeader eyebrow="Saved for later" title="Your Wishlist" description="Products you've saved. They're stored on this device." />
      <section className="section">
        <div className="container-page">
          {items.length === 0 ? (
            <EmptyState
              icon={<Heart className="h-7 w-7" />}
              title="Your wishlist is empty"
              description="Tap the heart on any product to save it here."
              action={<ButtonLink to="/shop">Browse the Shop</ButtonLink>}
            />
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-charcoal/70">{items.length} saved {items.length === 1 ? "item" : "items"}</p>
                <button type="button" onClick={clear} className="text-sm text-charcoal/60 underline hover:text-red-700">Clear wishlist</button>
              </div>
              <ProductGrid products={items} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
