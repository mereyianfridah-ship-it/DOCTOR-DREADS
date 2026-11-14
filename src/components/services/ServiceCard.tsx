import { useState } from "react";
import { Clock } from "lucide-react";
import type { Service } from "../../types";
import { ButtonLink } from "../common/Button";
import { PriceLabel } from "./PriceLabel";
import { serviceImage } from "../../utils/placeholderImages";

export function ServiceCard({ service, showDuration = false }: { service: Service; showDuration?: boolean }) {
  const consultation = service.bookingType === "consultation";
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !service.image || imgFailed;
  const placeholder = serviceImage(service.slug);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-charcoal/10 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[4/5] overflow-hidden bg-cream">
        <img
          src={showPlaceholder ? placeholder : service.image}
          alt={`${service.name} (${showPlaceholder ? "AI placeholder" : "sample image"})`}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-offwhite/95 px-3 py-1 text-xs font-semibold text-brown">
          {consultation ? "Consultation first" : "Instant booking"}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-brown">{service.category}</p>
        <h3 className="mt-1 text-2xl">{service.name}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-charcoal/70">{service.shortDescription}</p>
        {showDuration && (
          <p className="mt-3 flex items-center gap-2 text-sm text-charcoal/65">
            <Clock className="h-4 w-4" aria-hidden /> {service.duration}
          </p>
        )}
        <PriceLabel service={service} className="mt-4 block" />
        <div className="mt-5 grid grid-cols-2 gap-2">
          <ButtonLink to={`/services/${service.slug}`} variant="outline" size="sm">
            View Details
          </ButtonLink>
          <ButtonLink to={consultation ? "/consultation" : `/booking?service=${service.slug}`} size="sm">
            {consultation ? "Consult" : "Book Now"}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
