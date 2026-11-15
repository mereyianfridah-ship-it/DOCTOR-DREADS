import { PageHeader } from "../components/common/PageHeader";
import { SectionHeading } from "../components/common/SectionHeading";
import { BookingCTA } from "../components/home/BookingCTA";
import { SiteImage } from "../components/common/SiteImage";
import { useSiteImage } from "../hooks/useSiteImages";

export default function About() {
  const { loaded, image } = useSiteImage("about");
  const hasPhoto = !loaded || !!image;
  return (
    <>
      <PageHeader eyebrow="About" title="Loc culture, professional care" description="The story behind Dr Dread Kenya." />
      <section className="section">
        <div className={`container-page grid items-center gap-12 ${hasPhoto ? "lg:grid-cols-2" : "max-w-3xl"}`}>
          {hasPhoto && <SiteImage slot="about" width={900} alt="Dr Dread Kenya salon" loading="lazy" className="aspect-[4/5] w-full rounded-2xl object-cover" />}
          <div>
            <SectionHeading align="left" eyebrow="Who we are" title="Dedicated to dreadlocks and natural hair" />
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-charcoal/75">
              <p>Dr Dread Kenya is a dreadlocks and natural hair-care business based in Rongai, Kenya. We offer loc installation, retouching, maintenance and styling, plus a selection of hair-care products.</p>
              <p>Clients can visit the salon or ask about mobile service. Every journey begins with a conversation about your hair, your lifestyle and what you want your locs to say about you.</p>
            </div>
          </div>
        </div>
      </section>
      <BookingCTA />
    </>
  );
}
