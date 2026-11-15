import { useCatalog } from "../../context/CatalogContext";
import { ButtonLink } from "../common/Button";
import { SectionHeading } from "../common/SectionHeading";
import { ProductGrid } from "../shop/ProductGrid";

export function FeaturedProducts() {
  const { products, status } = useCatalog();
  const featured = [
    ...products.filter((p) => p.featured),
    ...products.filter((p) => !p.featured && p.stock > 0),
  ].slice(0, 4);
  if (status !== "ready" || featured.length === 0) return null;
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading eyebrow="The Shop" title="Natural hair-care essentials" description="Moisturizers, moulding gels and natural oils to keep your locs healthy between appointments." />
        <div className="mt-12">
          <ProductGrid products={featured} />
        </div>
        <div className="mt-12 text-center">
          <ButtonLink to="/shop" variant="secondary">
            Shop All Products
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
