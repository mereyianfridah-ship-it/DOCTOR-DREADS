import { galleryCategories } from "../../data/gallery";
import { CategoryFilter } from "../common/CategoryFilter";

export function GalleryFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <CategoryFilter options={galleryCategories} value={value} onChange={onChange} label="Filter gallery" />;
}
