import { useState } from "react";
import { placeholderForCategory, fallbackImage } from "../../utils/placeholderImages";

/** Product photo with a beautiful AI-generated placeholder fallback. */
export function ProductImage({
  src,
  alt,
  category,
  className = "",
  loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  category?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;
  const placeholder = showPlaceholder
    ? placeholderForCategory(category ?? "", Math.floor(Math.random() * 10000))
    : fallbackImage(Math.floor(Math.random() * 10000));

  return (
    <img
      src={showPlaceholder ? placeholder : src}
      alt={showPlaceholder ? `${alt} (AI placeholder)` : alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
