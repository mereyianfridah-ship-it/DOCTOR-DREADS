import { PreviewImage } from "./PreviewImage";
import { productImage } from "../../utils/placeholderImages";

/** Product photo. Real uploads show as-is; placeholder products get a matching real-photo preview. */
export function ProductImage({
  src,
  alt,
  category,
  name,
  className = "",
  loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  category?: string;
  /** Product name; used to pick a matching photo (comb, bonnet, castor oil...). Defaults to alt. */
  name?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  return (
    <PreviewImage
      src={src}
      preview={productImage(category ?? "", name ?? alt, src ?? "")}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
    />
  );
}
