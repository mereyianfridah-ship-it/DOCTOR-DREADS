import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { getGallery } from "../api/endpoints";
import { ButtonLink } from "../components/common/Button";
import { DemoNotice } from "../components/common/DemoNotice";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { QueryState } from "../components/common/QueryState";
import { GalleryFilter } from "../components/gallery/GalleryFilter";
import { GalleryGrid } from "../components/gallery/GalleryGrid";
import { useAsync } from "../hooks/useAsync";
import { categoriesOf } from "../utils/product";

export default function Gallery() {
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useAsync((s) => getGallery(s), []);
  const all = useMemo(() => data ?? [], [data]);
  const categories = useMemo(() => categoriesOf(all), [all]);
  const raw = params.get("category") ?? "";
  const category = categories.includes(raw) ? raw : "";
  const items = useMemo(() => (category ? all.filter((g) => g.category === category) : all), [category, all]);

  const setCategory = (c: string) => setParams(c ? { category: c } : {}, { replace: true });

  return (
    <>
      <PageHeader eyebrow="Gallery" title="Locs, styles & transformations" description="A look at the styles and care we love. Real client work will be added with permission." />
      <section className="section">
        <div className="container-page">
          <DemoNotice className="mb-8">
            Images and videos here are <strong>sample placeholders</strong> until real, consented photography is published. They are not real Dr Dread Kenya client work.
          </DemoNotice>
          <QueryState loading={loading} error={error} onRetry={reload}>
            <GalleryFilter categories={categories} value={category} onChange={setCategory} />
            <div className="mt-10">
              {items.length ? <GalleryGrid items={items} /> : <EmptyState title="Nothing here yet" />}
            </div>
          </QueryState>
          <div className="mt-14 text-center">
            <ButtonLink to="/booking" size="lg">Book Your Style</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
