import { useState } from "react";

/** Product photo with a neutral fallback for missing or broken images. */
export function ProductImage({
  src,
  alt,
  className = "",
  loading = "lazy",
}: {
  src?: string | null;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={`${alt} (no photo yet)`}
        className={`flex items-center justify-center bg-cream text-xs text-charcoal/40 ${className}`}
      >
        No photo yet
      </div>
    );
  }
  return <img src={src} alt={alt} loading={loading} decoding="async" onError={() => setFailed(true)} className={className} />;
}
