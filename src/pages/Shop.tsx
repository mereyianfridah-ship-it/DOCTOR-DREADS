import { useMemo, useState } from "react";
import { PackageSearch } from "lucide-react";
import { Button } from "../components/common/Button";
import { CategoryFilter } from "../components/common/CategoryFilter";
import { DemoNotice } from "../components/common/DemoNotice";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { SearchBar } from "../components/common/SearchBar";
import { ProductGrid } from "../components/shop/ProductGrid";
import { productCategories, products } from "../data/products";

type Sort = "featured" | "price-asc" | "price-desc" | "name";
const priceRanges = [
  { id: "all", label: "Any price", test: () => true },
  { id: "u800", label: "Under KSh 800", test: (p: number) => p < 800 },
  { id: "800-1200", label: "KSh 800 – 1,200", test: (p: number) => p >= 800 && p <= 1200 },
  { id: "o1200", label: "Over KSh 1,200", test: (p: number) => p > 1200 },
];

export default function Shop() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState<Sort>("featured");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const r = priceRanges.find((x) => x.id === range) ?? priceRanges[0];
    const list = products.filter(
      (p) =>
        (!category || p.category === category) &&
        r.test(p.price) &&
        (!q || `${p.name} ${p.shortDescription} ${p.category}`.toLowerCase().includes(q)),
    );
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
    return sorted;
  }, [query, category, range, sort]);

  const reset = () => {
    setQuery("");
    setCategory("");
    setRange("all");
    setSort("featured");
  };

  return (
    <>
      <PageHeader eyebrow="Shop" title="Hair-care essentials" description="Moisturizers, moulding gels, natural oils and accessories for healthy locs and natural hair." />
      <section className="section">
        <div className="container-page">
          <DemoNotice className="mb-8">
            <strong>Demonstration catalogue.</strong> Products, prices (KSh) and stock levels are samples, not real inventory.
          </DemoNotice>
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <SearchBar value={query} onChange={setQuery} />
            <div>
              <label htmlFor="price-range" className="sr-only">Price range</label>
              <select id="price-range" value={range} onChange={(e) => setRange(e.target.value)} className="input-base">
                {priceRanges.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="sort" className="sr-only">Sort products</label>
              <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="input-base">
                <option value="featured">Featured</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name: A–Z</option>
              </select>
            </div>
          </div>
          <div className="mt-5">
            <CategoryFilter options={productCategories} value={category} onChange={setCategory} allLabel="All products" label="Filter products" />
          </div>
          <p className="mt-6 text-sm text-charcoal/60" aria-live="polite">
            {results.length} product{results.length === 1 ? "" : "s"}
          </p>
          <div className="mt-4">
            {results.length ? (
              <ProductGrid products={results} />
            ) : (
              <EmptyState
                icon={<PackageSearch className="h-7 w-7" />}
                title="No products match"
                description="Try a different search term or clear your filters."
                action={<Button onClick={reset}>Clear filters</Button>}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
