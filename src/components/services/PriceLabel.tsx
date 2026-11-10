import type { Service } from "../../types";
import { formatKSh } from "../../utils/format";

export function priceText(s: Service): string {
  return s.priceFrom === null ? "Request a Quote" : `From ${formatKSh(s.priceFrom)}`;
}

export function PriceLabel({ service, className = "" }: { service: Service; className?: string }) {
  return (
    <span className={className}>
      <span className="font-bold">{priceText(service)}</span>
      {service.priceFrom !== null && <span className="ml-1.5 text-xs text-charcoal/55">(sample price)</span>}
    </span>
  );
}
