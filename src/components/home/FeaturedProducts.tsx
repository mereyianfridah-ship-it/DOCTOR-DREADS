import { products } from "../../data/products";
import { ButtonLink } from "../common/Button";
import { DemoNotice } from "../common/DemoNotice";
import { SectionHeading } from "../common/SectionHeading";
import { ProductGrid } from "../shop/ProductGrid";

export function FeaturedProducts() {
  const featured = [
    ...products.filter((p) => p.featured),
    ...products.filter((p) => !p.featured && p.stock > 0),
  ].slice(0, 4);
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading eyebrow="The Shop" title="Natural hair-care essentials" description="Moisturizers, moulding gels and natural oils to keep your locs healthy between appointments." />
        <DemoNotice className="mx-auto mt-8 max-w-2xl">
          These are <strong>demonstration products</strong> with sample prices and stock. They are not real inventory.
        </DemoNotice>
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
