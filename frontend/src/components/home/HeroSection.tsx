import { ButtonLink } from "../common/Button";

export function HeroSection() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-5rem)] items-center overflow-hidden bg-charcoal">
      <img
        src="/images/hero.svg"
        alt=""
        aria-hidden
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-charcoal/95 via-charcoal/75 to-charcoal/30" />
      <div className="container-page py-20">
        <div className="max-w-3xl animate-fade-up">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.35em] text-gold">Dr Dread Kenya · Rongai</p>
          <h1 className="text-4xl font-bold leading-[1.05] text-offwhite sm:text-6xl lg:text-7xl">
            YOUR LOCS. YOUR IDENTITY. YOUR STATEMENT.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-cream sm:text-lg">
            Professional dreadlocks services and natural hair-care essentials in Rongai. Discover your style, care for your
            locs and book your next appointment with Dr Dread Kenya.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/booking" size="lg">
              Book an Appointment
            </ButtonLink>
            <ButtonLink to="/shop" variant="light" size="lg">
              Explore Our Collection
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
