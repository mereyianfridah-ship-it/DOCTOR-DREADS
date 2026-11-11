import { useMemo, useState } from "react";
import { ButtonLink } from "../components/common/Button";
import { CategoryFilter } from "../components/common/CategoryFilter";
import { DemoNotice } from "../components/common/DemoNotice";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { ServiceCard } from "../components/services/ServiceCard";
import { QueryState } from "../components/common/QueryState";
import { useCatalog } from "../context/CatalogContext";
import { categoriesOf } from "../utils/product";

export default function Services() {
  const { services, status, error, reload } = useCatalog();
  const [category, setCategory] = useState("");
  const categories = useMemo(() => categoriesOf(services), [services]);
  const list = useMemo(() => (category ? services.filter((s) => s.category === category) : services), [category, services]);

  return (
    <>
      <PageHeader eyebrow="Services" title="Service catalogue" description="From first installation to everyday maintenance, explore how we care for locs and natural hair." />
      <section className="section">
        <div className="container-page">
          <DemoNotice className="mb-8">
            Prices are <strong>sample prices</strong> and durations are placeholders until confirmed by Dr Dread Kenya. Installation and complex services start with a consultation rather than a fixed price.
          </DemoNotice>
          <QueryState loading={status === "loading"} error={status === "error" ? error : null} onRetry={() => void reload()}>
            <CategoryFilter options={categories} value={category} onChange={setCategory} allLabel="All services" label="Filter services" />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {list.map((s) => (
                <ServiceCard key={s.slug} service={s} showDuration />
              ))}
            </div>
            {list.length === 0 && <EmptyState title="No services in this category" action={<ButtonLink to="/contact">Ask us</ButtonLink>} />}
          </QueryState>
        </div>
      </section>
    </>
  );
}
