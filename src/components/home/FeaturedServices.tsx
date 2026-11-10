import { services } from "../../data/services";
import { ButtonLink } from "../common/Button";
import { DemoNotice } from "../common/DemoNotice";
import { SectionHeading } from "../common/SectionHeading";
import { ServiceCard } from "../services/ServiceCard";

export function FeaturedServices() {
  const featured = services.filter((s) => s.featured);
  return (
    <section className="section bg-cream/50">
      <div className="container-page">
        <SectionHeading eyebrow="Our Services" title="Care for every stage of your loc journey" />
        <DemoNotice className="mx-auto mt-8 max-w-2xl">
          Prices shown are <strong>sample prices</strong> until Dr Dread Kenya supplies the real price list.
        </DemoNotice>
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
