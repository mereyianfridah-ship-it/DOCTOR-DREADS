import { useCatalog } from "../../context/CatalogContext";
import { ButtonLink } from "../common/Button";
import { SectionHeading } from "../common/SectionHeading";
import { ServiceCard } from "../services/ServiceCard";

export function FeaturedServices() {
  const { services, status } = useCatalog();
  const featured = services.filter((s) => s.featured);
  if (status !== "ready" || featured.length === 0) return null;
  return (
    <section className="section bg-cream/50">
      <div className="container-page">
        <SectionHeading eyebrow="Our Services" title="Care for every stage of your loc journey" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {featured.map((s) => (
            <ServiceCard key={s.slug} service={s} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <ButtonLink to="/services" variant="outline">
            View All Services
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
