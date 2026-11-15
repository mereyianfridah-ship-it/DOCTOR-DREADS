import { useMemo } from "react";
import { PackageSearch } from "lucide-react";
import { Button } from "../components/common/Button";
import { CategoryFilter } from "../components/common/CategoryFilter";
import { DemoNotice } from "../components/common/DemoNotice";
import { EmptyState } from "../components/common/EmptyState";
import { PageHeader } from "../components/common/PageHeader";
import { SearchBar } from "../components/common/SearchBar";
import { ProductGrid } from "../components/shop/ProductGrid";
import { QueryState } from "../components/common/QueryState";
import { useCatalog } from "../context/CatalogContext";
import { useSearchParams } from "react-router-dom";
import { categoriesOf, filterProducts, type ShopSort } from "../utils/product";

type Sort = ShopSort;
const priceRanges = [
  { id: "all", label: "Any price", min: undefined, max: undefined },
  { id: "u800", label: "Under KSh 800", min: undefined, max: 799 },
  { id: "800-1200", label: "KSh 800 – 1,200", min: 800, max: 1200 },
  { id: "o1200", label: "Over KSh 1,200", min: 1201, max: undefined },
];

export default function Shop() {
  const { products, status, error, reload } = useCatalog();
  const productCategories = useMemo(() => categoriesOf(products), [products]);
  // Filters live in the URL so a filtered shop view can be shared or bookmarked.
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const range = priceRanges.some((x) => x.id === params.get("price")) ? (params.get("price") as string) : "all";
  const sortParam = params.get("sort");
  const sort: Sort = sortParam === "price-asc" || sortParam === "price-desc" || sortParam === "name" ? sortParam : "featured";
  const inStockOnly = params.get("instock") === "1";

  const setParam = (key: string, value: string, fallback = "") =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== fallback) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  const setQuery = (v: string) => setParam("q", v);
  const setCategory = (v: string) => setParam("category", v);
  const setRange = (v: string) => setParam("price", v, "all");
  const setSort = (v: Sort) => setParam("sort", v, "featured");
  const setInStockOnly = (v: boolean) => setParam("instock", v ? "1" : "");

  const results = useMemo(() => {
    const r = priceRanges.find((x) => x.id === range) ?? priceRanges[0];
    return filterProducts(products, { query, category, minPrice: r.min, maxPrice: r.max, inStockOnly, sort });
  }, [query, category, range, sort, inStockOnly, products]);

  const reset = () => setParams({}, { replace: true });

  return (
    <>
      <PageHeader eyebrow="Shop" title="Hair-care essentials" description="Moisturizers, moulding gels, natural oils and accessories for healthy locs and natural hair." />
      <section className="section">
        <div className="container-page">
          <DemoNotice className="mb-8">
            <strong>Demonstration catalogue.</strong> Products, prices (KSh) and stock levels are samples, not real inventory.
          </DemoNotice>
          <QueryState loading={status === "loading"} error={status === "error" ? error : null} onRetry={() => void reload()}>
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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-charcoal/60" aria-live="polite">
              {results.length} product{results.length === 1 ? "" : "s"}
            </p>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal/80">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="h-4 w-4 accent-current" />
              In stock only
            </label>
          </div>
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
          </QueryState>
        </div>
      </section>
    </>
  );
}
