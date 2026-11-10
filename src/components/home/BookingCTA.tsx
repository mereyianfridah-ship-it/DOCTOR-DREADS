import { ButtonLink } from "../common/Button";

export function BookingCTA() {
  return (
    <section className="relative isolate overflow-hidden bg-brown py-20 text-center sm:py-28">
      <img src="/images/service-styling.svg" alt="" aria-hidden loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-charcoal/80" />
      <div className="container-page max-w-3xl">
        <h2 className="text-3xl font-bold uppercase text-offwhite sm:text-5xl">Ready to start your loc journey?</h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-cream/85">
          Book an appointment or begin with a free online photo consultation.
        </p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/booking" size="lg">
            Book Your Appointment
          </ButtonLink>
          <ButtonLink to="/consultation" variant="light" size="lg">
            Start a Consultation
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
