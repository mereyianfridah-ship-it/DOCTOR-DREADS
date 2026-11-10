import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ButtonLink } from "../components/common/Button";
import { DemoNotice } from "../components/common/DemoNotice";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { GalleryFilter } from "../components/gallery/GalleryFilter";
import { GalleryGrid } from "../components/gallery/GalleryGrid";
import { galleryCategories, galleryItems } from "../data/gallery";

export default function Gallery() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("category") ?? "";
  const category = (galleryCategories as readonly string[]).includes(raw) ? raw : "";
  const items = useMemo(() => (category ? galleryItems.filter((g) => g.category === category) : galleryItems), [category]);

  const setCategory = (c: string) => setParams(c ? { category: c } : {}, { replace: true });

  return (
    <>
      <PageHeader eyebrow="Gallery" title="Locs, styles & transformations" description="A look at the styles and care we love. Real client work will be added with permission." />
      <section className="section">
        <div className="container-page">
          <DemoNotice className="mb-8">
            All images and videos here are <strong>sample placeholders</strong>. They are not real Dr Dread Kenya client work.
          </DemoNotice>
          <GalleryFilter value={category} onChange={setCategory} />
          <div className="mt-10">
            {items.length ? <GalleryGrid items={items} /> : <EmptyState title="Nothing here yet" />}
          </div>
          <div className="mt-14 text-center">
            <ButtonLink to="/booking" size="lg">Book Your Style</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
