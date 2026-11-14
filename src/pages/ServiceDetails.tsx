import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck, Check, Clock, MessageCircle, Tag } from "lucide-react";
import { ButtonLink } from "../components/common/Button";
import { DemoNotice } from "../components/common/DemoNotice";
import { SectionHeading } from "../components/common/SectionHeading";
import { PriceLabel } from "../components/services/PriceLabel";
import { ServiceCard } from "../components/services/ServiceCard";
import { QueryState } from "../components/common/QueryState";
import { useCatalog } from "../context/CatalogContext";
import NotFound from "./NotFound";
import { PreviewImage } from "../components/common/PreviewImage";
import { serviceImage } from "../utils/placeholderImages";

export default function ServiceDetails() {
  const { slug = "" } = useParams();
  const { status, error, reload, getService } = useCatalog();
  if (status !== "ready") return <QueryState loading={status === "loading"} error={error} onRetry={() => void reload()}><></></QueryState>;
  const service = getService(slug);
  if (!service) return <NotFound />;
  return <ServiceView slug={slug} />;
}

function ServiceView({ slug }: { slug: string }) {
  const { services, getService } = useCatalog();
  const service = getService(slug)!;

  const consultation = service.bookingType === "consultation";
  const related = services.filter((s) => s.slug !== service.slug && s.category === service.category).concat(services.filter((s) => s.slug !== service.slug && s.category !== service.category)).slice(0, 3);

  return (
    <>
      <section className="section">
        <div className="container-page">
          <Link to="/services" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-brown hover:underline">
            <ArrowLeft className="h-4 w-4" /> All services
          </Link>
          <div className="grid gap-12 lg:grid-cols-2">
            <PreviewImage
              src={service.image}
              preview={serviceImage(service.slug)}
              alt={service.name}
              className="aspect-[4/5] w-full rounded-2xl object-cover"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brown">{service.category}</p>
              <h1 className="mt-2 text-4xl sm:text-5xl">{service.name}</h1>
              <p className="mt-5 text-lg leading-relaxed text-charcoal/75">{service.description}</p>

              <dl className="mt-8 grid gap-4 rounded-2xl border border-charcoal/10 bg-white p-6 sm:grid-cols-3">
                <div>
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal/55"><Tag className="h-4 w-4" />Price</dt>
                  <dd className="mt-1"><PriceLabel service={service} /></dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal/55"><Clock className="h-4 w-4" />Duration</dt>
                  <dd className="mt-1 text-sm">{service.duration}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-charcoal/55"><CalendarCheck className="h-4 w-4" />Booking type</dt>
                  <dd className="mt-1 text-sm">{consultation ? "Consultation first" : "Instant booking"}</dd>
                </div>
              </dl>

              <h2 className="mt-10 text-2xl">Benefits</h2>
              <ul className="mt-4 space-y-3">
                {service.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <Check className="mt-1 h-5 w-5 shrink-0 text-olive" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10">
                {consultation ? (
                  <>
                    <DemoNotice className="mb-5">
                      <MessageCircle className="mr-1 inline h-4 w-4" aria-hidden />
                      This service needs a consultation first so we can give you an accurate plan and quote.
                    </DemoNotice>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <ButtonLink to="/consultation" size="lg">Start a Consultation</ButtonLink>
                      <ButtonLink to="/contact" variant="outline" size="lg">Ask a Question</ButtonLink>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <ButtonLink to={`/booking?service=${service.slug}`} size="lg">Book Now</ButtonLink>
                    <ButtonLink to="/consultation" variant="outline" size="lg">Not sure? Consult first</ButtonLink>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="section bg-cream/50">
        <div className="container-page">
          <SectionHeading eyebrow="More services" title="You may also like" />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((s) => <ServiceCard key={s.slug} service={s} />)}
          </div>
        </div>
      </section>
    </>
  );
}
