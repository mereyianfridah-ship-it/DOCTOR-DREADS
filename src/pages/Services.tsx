import { useMemo, useState } from "react";
import { ButtonLink } from "../components/common/Button";
import { CategoryFilter } from "../components/common/CategoryFilter";
import { DemoNotice } from "../components/common/DemoNotice";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { ServiceCard } from "../components/services/ServiceCard";
import { serviceCategories, services } from "../data/services";

export default function Services() {
  const [category, setCategory] = useState("");
  const list = useMemo(() => (category ? services.filter((s) => s.category === category) : services), [category]);

  return (
    <>
      <PageHeader eyebrow="Services" title="Service catalogue" description="From first installation to everyday maintenance, explore how we care for locs and natural hair." />
      <section className="section">
        <div className="container-page">
          <DemoNotice className="mb-8">
            Prices are <strong>sample prices</strong> and durations are placeholders until confirmed by Dr Dread Kenya. Installation and complex services start with a consultation rather than a fixed price.
          </DemoNotice>
          <CategoryFilter options={serviceCategories} value={category} onChange={setCategory} allLabel="All services" label="Filter services" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((s) => (
              <ServiceCard key={s.slug} service={s} showDuration />
            ))}
          </div>
          {list.length === 0 && <EmptyState title="No services in this category" action={<ButtonLink to="/contact">Ask us</ButtonLink>} />}
        </div>
      </section>
    </>
  );
}
