import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, CreditCard, MapPin, Scissors, Smartphone, Store } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "../components/common/Button";
import { DemoNotice } from "../components/common/DemoNotice";
import { FormField } from "../components/common/FormField";
import { PageHeader } from "../components/common/PageHeader";
import { BookingStepper } from "../components/booking/BookingStepper";
import { BookingSummary } from "../components/booking/BookingSummary";
import type { BookingDraft } from "../components/booking/BookingSummary";
import { DatePicker } from "../components/booking/DatePicker";
import { PriceLabel } from "../components/services/PriceLabel";
import { siteConfig, stylists } from "../config/site";
import { getService, instantServices, services } from "../data/services";
import { getDemoSlots } from "../utils/availability";
import { formatKSh, formatLongDate } from "../utils/format";
import { phoneSchema } from "../utils/validation";

const STEPS = ["Service", "Location", "Date", "Time", "Stylist", "Details", "Review", "Deposit"] as const;

const detailsSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address"),
  notes: z.string().trim().max(500, "Please keep notes under 500 characters"),
});
type Details = z.infer<typeof detailsSchema>;

const emptyDraft: BookingDraft = { serviceSlug: "", location: "", date: "", time: "", stylist: "", fullName: "", phone: "", email: "", notes: "" };

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
  const [params] = useSearchParams();
  const preset = getService(params.get("service") ?? "");
  const presetOk = preset && preset.bookingType === "instant";

  const [step, setStep] = useState(presetOk ? 1 : 0);
  const [draft, setDraft] = useState<BookingDraft>({ ...emptyDraft, serviceSlug: presetOk ? preset!.slug : "" });
  const [demoDone, setDemoDone] = useState<null | "mpesa" | "card">(null);

  const service = getService(draft.serviceSlug);
  const deposit = service && service.priceFrom !== null ? Math.round((service.priceFrom * siteConfig.booking.depositPercent) / 100) : null;
  const patch = (p: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...p }));

  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), [today]);
  const maxDate = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + siteConfig.booking.advanceDays), [today]);
  const slots = useMemo(() => (draft.date ? getDemoSlots(draft.date, "auto") : []), [draft.date]);

  const canContinue =
    (step === 0 && !!draft.serviceSlug) ||
    (step === 1 && !!draft.location) ||
    (step === 2 && !!draft.date) ||
    (step === 3 && !!draft.time) ||
    (step === 4 && !!draft.stylist);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));
  const restart = () => {
    setDraft(emptyDraft);
    setDemoDone(null);
    setStep(0);
  };

  const detailsForm = useForm<Details>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { fullName: draft.fullName, phone: draft.phone, email: draft.email, notes: draft.notes },
  });

  const submitDetails = (v: Details) => {
    patch(v);
    next();
  };

  const nav = (
    <div className="mt-8 flex items-center justify-between gap-3">
      <Button variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
      {step <= 4 && <Button onClick={next} disabled={!canContinue}>Continue</Button>}
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Booking" title="Book an appointment" description="Choose your service, time and stylist in a few easy steps." />
      <section className="section">
        <div className="container-page">
          <DemoNotice className="mb-8">
            <strong>Demonstration booking.</strong> Availability is sample data and no real appointment is created or reserved.
          </DemoNotice>
          <BookingStepper steps={STEPS} current={step} />

          <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
            <div>
              {step === 0 && (
                <div>
                  <h2 className="text-3xl">Select a service</h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {instantServices.map((s) => (
                      <Choice key={s.slug} selected={draft.serviceSlug === s.slug} onClick={() => patch({ serviceSlug: s.slug })}>
                        <p className="font-display text-lg">{s.name}</p>
                        <p className="mt-1 text-xs text-charcoal/60">{s.duration}</p>
                        <PriceLabel service={s} className="mt-2 block text-sm" />
                      </Choice>
                    ))}
                  </div>
                  <div className="mt-6 rounded-xl border border-charcoal/10 bg-cream/60 p-5 text-sm">
                    <p className="font-semibold">Looking for loc installation or repair?</p>
                    <p className="mt-1 text-charcoal/70">
                      {services.filter((s) => s.bookingType === "consultation").map((s) => s.name).join(" and ")} start with a consultation instead of a fixed-price booking.
                    </p>
                    <Link to="/consultation" className="mt-2 inline-block font-semibold text-brown underline">Start a consultation</Link>
                  </div>
                  {nav}
                </div>
              )}

              {step === 1 && (
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
                      <p className="text-sm text-charcoal/65">We come to you. Availability and any travel fee to be confirmed.</p>
                    </Choice>
                  </div>
                  {nav}
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="text-3xl">Choose your preferred date</h2>
                  <div className="mt-6 max-w-md">
                    <DatePicker value={draft.date} onChange={(iso) => patch({ date: iso, time: "" })} minDate={minDate} maxDate={maxDate} />
                  </div>
                  {nav}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="text-3xl">Select an available time</h2>
                  <p className="mt-1 text-charcoal/65">{formatLongDate(draft.date)}</p>
                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {slots.map((s) => (
                      <Choice key={s.time} selected={draft.time === s.time} disabled={!s.available} onClick={() => patch({ time: s.time })}>
                        <span className="block text-center font-semibold">{s.time}</span>
                        <span className="block text-center text-xs text-charcoal/55">{s.available ? "Available" : "Unavailable"}</span>
                      </Choice>
                    ))}
                  </div>
                  {nav}
                </div>
              )}

              {step === 4 && (
                <div>
                  <h2 className="text-3xl">Choose a stylist</h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {stylists.map((s) => (
                      <Choice key={s.id} selected={draft.stylist === s.id} onClick={() => patch({ stylist: s.id })}>
                        <Scissors className="h-5 w-5 text-brown" aria-hidden />
                        <p className="mt-2 font-display text-lg">{s.name}</p>
                        <p className="text-xs text-charcoal/60">{s.note}</p>
                      </Choice>
                    ))}
                  </div>
                  {nav}
                </div>
              )}

              {step === 5 && (
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

              {step === 6 && (
                <div>
                  <h2 className="text-3xl">Review your appointment</h2>
                  <dl className="mt-6 divide-y divide-charcoal/10 rounded-2xl border border-charcoal/10 bg-white px-6">
                    {[
                      ["Service", service?.name ?? ""],
                      ["Location", draft.location === "salon" ? "Physical salon" : "Mobile service"],
                      ["Date", formatLongDate(draft.date)],
                      ["Time", draft.time],
                      ["Stylist", stylists.find((s) => s.id === draft.stylist)?.name ?? ""],
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
                    <Button onClick={next}>Continue to Deposit</Button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div>
                  <h2 className="text-3xl">Deposit (demonstration)</h2>
                  {demoDone ? (
                    <div role="status" className="mt-6 rounded-2xl border border-olive/30 bg-olive/10 p-8 text-center">
                      <CheckCircle2 className="mx-auto h-12 w-12 text-olive" aria-hidden />
                      <h3 className="mt-4 text-2xl">Demonstration complete</h3>
                      <p className="mt-2 text-charcoal/80">
                        You chose to pay by {demoDone === "mpesa" ? "M-Pesa" : "card"}. <strong>No payment was taken and no appointment has been booked.</strong> Real deposit payment and confirmations will be connected in the next phase.
                      </p>
                      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button onClick={restart}>Start a new demo booking</Button>
                        <ButtonLink to="/services" variant="outline">Browse services</ButtonLink>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-6 rounded-2xl border border-charcoal/10 bg-white p-6">
                        <p className="text-charcoal/70">
                          {deposit !== null
                            ? `A deposit of ${siteConfig.booking.depositPercent}% secures your slot. Sample deposit:`
                            : "Deposit details will be confirmed by the business."}
                        </p>
                        {deposit !== null && <p className="mt-1 text-4xl font-display">{formatKSh(deposit)}</p>}
                      </div>
                      <div className="mt-6 grid gap-3 sm:grid-cols-2">
                        <Button size="lg" onClick={() => { setDemoDone("mpesa"); toast.info("Demo only: no payment taken."); }}>
                          <Smartphone className="h-5 w-5" aria-hidden /> Pay deposit with M-Pesa
                        </Button>
                        <Button size="lg" variant="secondary" onClick={() => { setDemoDone("card"); toast.info("Demo only: no payment taken."); }}>
                          <CreditCard className="h-5 w-5" aria-hidden /> Pay deposit by card
                        </Button>
                      </div>
                      <DemoNotice className="mt-6">Real M-Pesa and card payments are not connected yet.</DemoNotice>
                      <div className="mt-6"><Button variant="ghost" onClick={back}>Back</Button></div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="lg:sticky lg:top-28 lg:self-start">
              <BookingSummary draft={draft} service={service} deposit={step >= 6 ? deposit : null} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
