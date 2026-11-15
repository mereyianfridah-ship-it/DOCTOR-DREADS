import { SafeImage } from "./SafeImage";

/** Product photo. Shows the uploaded photo, or an empty neutral block when the product has none yet. */
export function ProductImage({
  src,
  alt,
  className = "",
  loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  category?: string;
  name?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  if (!src) return <div aria-hidden className={`${className} bg-cream`} />;
  return <SafeImage src={src} alt={alt} loading={loading} decoding="async" className={className} />;
}
