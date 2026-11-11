import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, MapPin, Scissors, Store } from "lucide-react";
import { toast } from "sonner";
import { ApiError, errorMessage } from "../api/client";
import { createBooking, getAvailability } from "../api/endpoints";
import { Button, ButtonLink } from "../components/common/Button";
import { DemoNotice } from "../components/common/DemoNotice";
import { FormField } from "../components/common/FormField";
import { HoldCountdown } from "../components/common/HoldCountdown";
import { PageHeader } from "../components/common/PageHeader";
import { QueryState } from "../components/common/QueryState";
import { BookingStepper } from "../components/booking/BookingStepper";
import { BookingSummary } from "../components/booking/BookingSummary";
import type { BookingDraft } from "../components/booking/BookingSummary";
import { DatePicker } from "../components/booking/DatePicker";
import { PriceLabel } from "../components/services/PriceLabel";
import { siteConfig } from "../config/site";
import { useAuth } from "../context/AuthContext";
import { useCatalog } from "../context/CatalogContext";
import { useAsync } from "../hooks/useAsync";
import type { BookingRecord } from "../types";
import { rememberGuestEmail } from "../utils/guestAccess";
import { formatKSh, formatLongDate } from "../utils/format";
import { phoneSchema } from "../utils/validation";

// Stylist is chosen before time so the availability shown matches the chosen stylist.
const STEPS = ["Service", "Location", "Date", "Stylist", "Time", "Details", "Review", "Hold slot"] as const;
const STEP = { service: 0, location: 1, date: 2, stylist: 3, time: 4, details: 5, review: 6, hold: 7 } as const;

const detailsSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address"),
  notes: z.string().trim().max(500, "Please keep notes under 500 characters"),
});
type Details = z.infer<typeof detailsSchema>;

const emptyDraft: BookingDraft = { serviceSlug: "", location: "", date: "", time: "", stylist: "auto", fullName: "", phone: "", email: "", notes: "" };

function Choice({ selected, onClick, children, disabled }: { selected: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`w-full rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border-gold bg-gold/10 ring-2 ring-gold/40" : "border-charcoal/15 bg-white hover:border-charcoal/50"}`}
    >
      {children}
    </button>
  );
}

export default function Booking() {
  const { status, error, reload, rules, services, getService } = useCatalog();
  return (
    <>
      <PageHeader eyebrow="Booking" title="Book an appointment" description="Choose your service, time and stylist in a few easy steps." />
      <section className="section">
        <div className="container-page">
          <QueryState loading={status === "loading"} error={status === "error" ? error : null} onRetry={() => void reload()}>
            {rules && <BookingFlow rules={rules} services={services} getService={getService} />}
          </QueryState>
        </div>
      </section>
    </>
  );
}

function BookingFlow({ rules, services, getService }: { rules: NonNullable<ReturnType<typeof useCatalog>["rules"]>; services: ReturnType<typeof useCatalog>["services"]; getService: ReturnType<typeof useCatalog>["getService"] }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const found = getService(params.get("service") ?? "");
  const preset = found && found.bookingType === "instant" && found.priceFrom !== null ? found : undefined;
  const instantServices = services.filter((s) => s.bookingType === "instant" && s.priceFrom !== null);

  const [step, setStep] = useState<number>(preset ? STEP.location : STEP.service);
  const [draft, setDraft] = useState<BookingDraft>({ ...emptyDraft, serviceSlug: preset ? preset.slug : "", fullName: user?.fullName ?? "", phone: user?.phone ?? "", email: user?.email ?? "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<BookingRecord | null>(null);

  const service = getService(draft.serviceSlug);
  const stylists = rules.stylists;
  const deposit = service && service.priceFrom !== null ? Math.round((service.priceFrom * rules.booking.depositPercent) / 100) : null;
  const patch = (p: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...p }));

  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), [today]);
  const maxDate = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + rules.booking.advanceDays), [today, rules.booking.advanceDays]);

  const availability = useAsync(
    (signal) => (draft.date && step === STEP.time ? getAvailability(draft.date, draft.stylist || "auto", signal) : Promise.resolve(null)),
    [draft.date, draft.stylist, step],
  );

  const canContinue =
    (step === STEP.service && !!draft.serviceSlug) ||
    (step === STEP.location && !!draft.location) ||
    (step === STEP.date && !!draft.date) ||
    (step === STEP.stylist && !!draft.stylist) ||
    (step === STEP.time && !!draft.time);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const restart = () => {
    setDraft({ ...emptyDraft, fullName: user?.fullName ?? "", phone: user?.phone ?? "", email: user?.email ?? "" });
    setResult(null);
    setSubmitError(null);
    setStep(STEP.service);
  };

  const detailsForm = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { fullName: draft.fullName, phone: draft.phone, email: draft.email, notes: draft.notes },
  });
  const submitDetails = (v: Details) => {
    patch(v);
    next();
  };

  const submitBooking = async () => {
    if (!draft.location) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await createBooking({
        serviceSlug: draft.serviceSlug, location: draft.location, date: draft.date, time: draft.time, stylist: draft.stylist,
        fullName: draft.fullName, phone: draft.phone, email: draft.email, notes: draft.notes,
      });
      rememberGuestEmail("booking", r.booking.reference, draft.email);
      setResult(r.booking);
      toast.success("Slot held. See the next steps below.");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        // Someone else took the slot: send the customer back to pick another one.
        patch({ time: "" });
        setStep(STEP.time);
        toast.error("That time was just taken. Please choose another slot.");
      } else if (e instanceof ApiError && e.fields) {
        setSubmitError(Object.values(e.fields).join(". ") || e.message);
      } else {
        setSubmitError(errorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const nav = (
    <div className="mt-8 flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
      {step <= STEP.time && <Button onClick={next} disabled={!canContinue}>Continue</Button>}
    </div>
  );

  if (result) {
    return (
      <div role="status" className="mx-auto max-w-2xl rounded-2xl border border-olive/30 bg-olive/10 p-8 text-center sm:p-10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-olive" aria-hidden />
        <h2 className="mt-4 text-3xl">Your slot is on hold</h2>
        <p className="mt-2 text-charcoal/80">Reference <strong className="font-mono">{result.reference}</strong></p>
        <p className="mt-1 text-sm text-charcoal/70">{result.service} · {formatLongDate(result.date)} at {result.time}</p>
        <div className="mt-4"><HoldCountdown expiresAt={result.expiresAt} /></div>
        <div className="mt-6 rounded-xl border border-gold/40 bg-white/70 p-5 text-left text-sm">
          <p className="font-semibold">This appointment is not confirmed yet.</p>
          <p className="mt-1 text-charcoal/75">
            A deposit of <strong>{formatKSh(result.depositAmount)}</strong> is required to confirm it. <strong>Online deposit payment is not available yet</strong>, so the hold will lapse
            automatically and the slot will be released. Please contact us to arrange your deposit before the hold ends.
          </p>
        </div>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to={`/bookings/${result.reference}`}>View booking status</ButtonLink>
          <ButtonLink to="/contact" variant="outline">Contact us</ButtonLink>
          <Button variant="ghost" onClick={restart}>Make another booking</Button>
        </div>
      </div>
    );
  }

  const stylistName = (id: string) => stylists.find((s) => s.id === id)?.name ?? "";

  return (
    <>
      <BookingStepper steps={STEPS} current={step} />
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          {step === STEP.service && (
            <div>
              <h2 className="text-3xl">Select a service</h2>
              {instantServices.length === 0 ? (
                <p className="mt-6 text-charcoal/70">No services are open for instant booking right now. Please <Link to="/consultation" className="font-semibold text-brown underline">start a consultation</Link> or <Link to="/contact" className="font-semibold text-brown underline">contact us</Link>.</p>
              ) : (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {instantServices.map((s) => (
                    <Choice key={s.slug} selected={draft.serviceSlug === s.slug} onClick={() => patch({ serviceSlug: s.slug })}>
                      <p className="font-display text-lg">{s.name}</p>
                      <p className="mt-1 text-xs text-charcoal/60">{s.duration}</p>
                      <PriceLabel service={s} className="mt-2 block text-sm" />
                    </Choice>
                  ))}
                </div>
              )}
              <div className="mt-6 rounded-xl border border-charcoal/10 bg-cream/60 p-5 text-sm">
                <p className="font-semibold">Looking for loc installation or repair?</p>
                <p className="mt-1 text-charcoal/70">
                  {services.filter((s) => s.bookingType === "consultation").map((s) => s.name).join(" and ") || "Some services"} start with a consultation instead of a fixed-price booking.
                </p>
                <Link to="/consultation" className="mt-2 inline-block font-semibold text-brown underline">Start a consultation</Link>
              </div>
              {nav}
            </div>
          )}

          {step === STEP.location && (
            <div>
              <h2 className="text-3xl">Where would you like your service?</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Choice selected={draft.location === "salon"} onClick={() => patch({ location: "salon" })}>
                  <Store className="h-6 w-6 text-brown" aria-hidden />
                  <p className="mt-2 font-display text-lg">Physical salon</p>
                  <p className="text-sm text-charcoal/65">Visit us in {siteConfig.location}</p>
                </Choice>
                <Choice selected={draft.location === "mobile"} onClick={() => patch({ location: "mobile" })}>
                  <MapPin className="h-6 w-6 text-brown" aria-hidden />
                  <p className="mt-2 font-display text-lg">Mobile service</p>
                  <p className="text-sm text-charcoal/65">We come to you. Service areas and any travel fee will be confirmed with you after you book.</p>
                </Choice>
              </div>
              {nav}
            </div>
          )}

          {step === STEP.date && (
            <div>
              <h2 className="text-3xl">Choose your preferred date</h2>
              <div className="mt-6 max-w-md">
                <DatePicker value={draft.date} onChange={(iso) => patch({ date: iso, time: "" })} minDate={minDate} maxDate={maxDate} openDays={rules.booking.openDays} />
              </div>
              {nav}
            </div>
          )}

          {step === STEP.stylist && (
            <div>
              <h2 className="text-3xl">Choose a stylist</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {stylists.map((s) => (
                  <Choice key={s.id} selected={draft.stylist === s.id} onClick={() => patch({ stylist: s.id, time: "" })}>
                    <Scissors className="h-5 w-5 text-brown" aria-hidden />
                    <p className="mt-2 font-display text-lg">{s.name}</p>
                    <p className="text-xs text-charcoal/60">{s.note}</p>
                  </Choice>
                ))}
              </div>
              {nav}
            </div>
          )}

          {step === STEP.time && (
            <div>
              <h2 className="text-3xl">Select an available time</h2>
              <p className="mt-1 text-charcoal/65">{formatLongDate(draft.date)} · {stylistName(draft.stylist)}</p>
              <div className="mt-6">
                <QueryState loading={availability.loading} error={availability.error} onRetry={availability.reload} loadingLabel="Checking availability">
                  {availability.data && !availability.data.open ? (
                    <p className="rounded-xl border border-charcoal/10 bg-white p-5 text-sm">The salon is closed on this day. Please go back and choose another date.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {(availability.data?.slots ?? []).map((s) => (
                        <Choice key={s.time} selected={draft.time === s.time} disabled={!s.available} onClick={() => patch({ time: s.time })}>
                          <span className="block text-center font-semibold">{s.time}</span>
                          <span className="block text-center text-xs text-charcoal/55">{s.available ? "Available" : "Unavailable"}</span>
                        </Choice>
                      ))}
                    </div>
                  )}
                </QueryState>
              </div>
              {nav}
            </div>
          )}

          {step === STEP.details && (
            <form onSubmit={detailsForm.handleSubmit(submitDetails)} noValidate className="space-y-5">
              <h2 className="text-3xl">Your details</h2>
              <FormField label="Full name" htmlFor="b-name" error={detailsForm.formState.errors.fullName?.message}>
                <input id="b-name" autoComplete="name" className={`input-base ${detailsForm.formState.errors.fullName ? "input-error" : ""}`} {...detailsForm.register("fullName")} />
              </FormField>
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Phone number" htmlFor="b-phone" error={detailsForm.formState.errors.phone?.message}>
                  <input id="b-phone" type="tel" autoComplete="tel" placeholder="e.g. 0712 345 678" className={`input-base ${detailsForm.formState.errors.phone ? "input-error" : ""}`} {...detailsForm.register("phone")} />
                </FormField>
                <FormField label="Email" htmlFor="b-email" error={detailsForm.formState.errors.email?.message}>
                  <input id="b-email" type="email" autoComplete="email" className={`input-base ${detailsForm.formState.errors.email ? "input-error" : ""}`} {...detailsForm.register("email")} />
                </FormField>
              </div>
              <FormField label="Additional instructions" htmlFor="b-notes" optional error={detailsForm.formState.errors.notes?.message}>
                <textarea id="b-notes" rows={4} className="input-base" {...detailsForm.register("notes")} />
              </FormField>
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button variant="ghost" onClick={back}>Back</Button>
                <Button type="submit">Review Booking</Button>
              </div>
            </form>
          )}

          {step === STEP.review && (
            <div>
              <h2 className="text-3xl">Review your appointment</h2>
              <dl className="mt-6 divide-y divide-charcoal/10 rounded-2xl border border-charcoal/10 bg-white px-6">
                {[
                  ["Service", service?.name ?? ""],
                  ["Location", draft.location === "salon" ? "Physical salon" : "Mobile service"],
                  ["Date", formatLongDate(draft.date)],
                  ["Time", draft.time],
                  ["Stylist", stylistName(draft.stylist)],
                  ["Name", draft.fullName],
                  ["Phone", draft.phone],
                  ["Email", draft.email],
                  ["Notes", draft.notes || "None"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-3 text-sm">
                    <dt className="text-charcoal/60">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back}>Back</Button>
                <Button onClick={next}>Continue</Button>
              </div>
            </div>
          )}

          {step === STEP.hold && (
            <div>
              <h2 className="text-3xl">Hold your slot</h2>
              <div className="mt-6 rounded-2xl border border-charcoal/10 bg-white p-6">
                <p className="text-charcoal/70">
                  {deposit !== null
                    ? `A deposit of ${rules.booking.depositPercent}% is required to confirm your appointment:`
                    : "Deposit details will be confirmed by the business."}
                </p>
                {deposit !== null && <p className="mt-1 font-display text-4xl">{formatKSh(deposit)}</p>}
              </div>
              <DemoNotice className="mt-6">
                Choosing <strong>Hold this slot</strong> reserves it for a short time. <strong>Your appointment is not confirmed until the deposit is received.</strong> Online
                M-Pesa and card deposit payment is not available yet.
              </DemoNotice>
              {submitError && <p role="alert" className="mt-4 text-sm text-red-700">{submitError}</p>}
              <div className="mt-6 flex items-center justify-between gap-3">
                <Button variant="ghost" onClick={back} disabled={submitting}>Back</Button>
                <Button size="lg" onClick={() => void submitBooking()} disabled={submitting}>
                  {submitting ? "Holding slot…" : "Hold this slot"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <BookingSummary draft={draft} service={service} deposit={step >= STEP.review ? deposit : null} stylists={stylists} />
        </div>
      </div>
    </>
  );
}
