import { ButtonLink } from "../common/Button";
import { SectionHeading } from "../common/SectionHeading";
import { PreviewImage } from "../common/PreviewImage";
import { locsImage, salonImage } from "../../utils/placeholderImages";

export function IntroSection() {
  return (
    <section className="section">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className="grid grid-cols-2 gap-4">
          <PreviewImage src="/images/about-2.svg" preview={locsImage(1)} alt="Dr Dread Kenya styling" loading="lazy" className="aspect-[4/5] w-full rounded-2xl object-cover" />
          <PreviewImage src="/images/about.svg" preview={salonImage(2)} alt="Dr Dread Kenya salon" loading="lazy" className="mt-10 aspect-[4/5] w-full rounded-2xl object-cover" />
        </div>
        <div>
          <SectionHeading align="left" eyebrow="Welcome" title="Where Loc Culture Meets Professional Care" />
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-charcoal/75">
            <p>
              Dr Dread Kenya is a business based in Rongai that specialises in dreadlocks and natural hair care, offering
              installation, retouching, maintenance and styling, alongside a range of hair-care products.
            </p>
            <p>
              Services are available at the salon and, where arranged, as a mobile service. Every client journey starts with
              listening to your hair and your goals.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to="/about" variant="secondary">
              Our Story
            </ButtonLink>
            <ButtonLink to="/consultation" variant="outline">
              Free Photo Consultation
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
