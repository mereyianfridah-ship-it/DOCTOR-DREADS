import type { Service } from "../../types";
import { stylists } from "../../config/site";
import { formatKSh, formatLongDate } from "../../utils/format";

export interface BookingDraft {
  serviceSlug: string;
  location: "" | "salon" | "mobile";
  date: string;
  time: string;
  stylist: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}

export function BookingSummary({ draft, service, deposit }: { draft: BookingDraft; service?: Service; deposit?: number | null }) {
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <dt className="text-charcoal/60">{label}</dt>
      <dd className="text-right font-medium">{value || <span className="text-charcoal/35">Not selected</span>}</dd>
    </div>
  );
  return (
    <aside className="rounded-2xl border border-charcoal/10 bg-white p-6">
      <h2 className="text-2xl">Booking summary</h2>
      <p className="mt-1 text-xs text-brown">Demonstration only. Not a real booking.</p>
      <dl className="mt-4 divide-y divide-charcoal/10">
        {row("Service", service?.name ?? "")}
        {row("Location", draft.location === "salon" ? "Physical salon" : draft.location === "mobile" ? "Mobile service" : "")}
        {row("Date", draft.date ? formatLongDate(draft.date) : "")}
        {row("Time", draft.time)}
        {row("Stylist", stylists.find((s) => s.id === draft.stylist)?.name ?? "")}
        {draft.fullName && row("Name", draft.fullName)}
        {draft.phone && row("Phone", draft.phone)}
      </dl>
      {service && (
        <div className="mt-4 border-t border-charcoal/10 pt-4 text-sm">
          <div className="flex justify-between">
            <span>Sample price</span>
            <span className="font-semibold">{service.priceFrom === null ? "Quote" : formatKSh(service.priceFrom)}</span>
          </div>
          {deposit != null && (
            <div className="mt-2 flex justify-between">
              <span>Sample deposit</span>
              <span className="font-semibold">{formatKSh(deposit)}</span>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
