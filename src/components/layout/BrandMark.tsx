import { Link } from "react-router-dom";

/** Temporary text-based brand mark. Replace with the official logo when supplied. */
export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className="flex flex-col leading-none" aria-label="Dr Dread Kenya home">
      <span className={`font-display text-2xl font-bold tracking-tight ${light ? "text-offwhite" : "text-charcoal"}`}>
        Dr Dread
      </span>
      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Kenya</span>
    </Link>
  );
}
