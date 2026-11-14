import { Droplets, Eye, Sprout, Target } from "lucide-react";
import { ButtonLink } from "../components/common/Button";
import { PageHeader } from "../components/common/PageHeader";
import { SectionHeading } from "../components/common/SectionHeading";
import { BookingCTA } from "../components/home/BookingCTA";
import { PreviewImage } from "../components/common/PreviewImage";
import { salonImage } from "../utils/placeholderImages";

/** EDITABLE content: replace with the owner's own words. */
const pillars = [
  { icon: Target, title: "Mission", text: "To help every client wear their locs and natural hair with confidence, supported by professional care and honest advice." },
  { icon: Eye, title: "Vision", text: "To be a trusted home for loc culture and natural hair care in Rongai and beyond." },
  { icon: Sprout, title: "Natural hair philosophy", text: "Healthy hair starts with a calm scalp, steady moisture and gentle handling, so we focus on care, not shortcuts." },
  { icon: Droplets, title: "Brand philosophy", text: "Locs are identity, culture and personal expression. Our work respects all three." },
];

export default function About() {
  return (
    <>
      <PageHeader eyebrow="About" title="Loc culture, professional care" description="The story and philosophy behind Dr Dread Kenya." />
      <section className="section">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <PreviewImage src="/images/about.svg" preview={salonImage(3)} alt="Dr Dread Kenya salon" loading="lazy" className="aspect-[4/5] w-full rounded-2xl object-cover" />
          <div>
            <SectionHeading align="left" eyebrow="Who we are" title="Dedicated to dreadlocks and natural hair" />
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-charcoal/75">
              <p>Dr Dread Kenya is a dreadlocks and natural hair-care business based in Rongai, Kenya. We offer loc installation, retouching, maintenance and styling, plus a selection of hair-care products.</p>
              <p>Clients can visit the salon or ask about mobile service. Every journey begins with a conversation about your hair, your lifestyle and what you want your locs to say about you.</p>
              <p className="rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
                <strong>Editable content:</strong> this page's text is a factual placeholder. Replace it with the owner's story, team details and any verified credentials.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="section bg-cream/50">
        <div className="container-page">
          <SectionHeading eyebrow="What guides us" title="Our philosophy" />
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-5 rounded-2xl bg-white p-7">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/20 text-brown">
                  <Icon className="h-6 w-6" aria-hidden />
                </div>
                <div>
                  <h3 className="text-2xl">{title}</h3>
                  <p className="mt-2 leading-relaxed text-charcoal/70">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <ButtonLink to="/services" variant="outline">
              Explore Our Services
            </ButtonLink>
          </div>
        </div>
      </section>
      <BookingCTA />
    </>
  );
}
