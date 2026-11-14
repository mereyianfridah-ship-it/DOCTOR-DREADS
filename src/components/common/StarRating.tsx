import { Star } from "lucide-react";

/** Read-only row of stars, e.g. 4 out of 5. */
export function StarRating({ value, className = "" }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`inline-flex gap-0.5 ${className}`} role="img" aria-label={`${v} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-4 w-4 ${n <= v ? "fill-gold text-gold" : "text-charcoal/25"}`} aria-hidden />
      ))}
    </span>
  );
}
