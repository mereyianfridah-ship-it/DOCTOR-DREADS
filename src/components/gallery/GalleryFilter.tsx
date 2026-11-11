import { CategoryFilter } from "../common/CategoryFilter";

export function GalleryFilter({ categories, value, onChange }: { categories: readonly string[]; value: string; onChange: (v: string) => void }) {
  return <CategoryFilter options={categories} value={value} onChange={onChange} label="Filter gallery" />;
}
