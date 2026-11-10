import { testimonials } from "../../data/testimonials";
import { DemoNotice } from "../common/DemoNotice";
import { SectionHeading } from "../common/SectionHeading";
import { TestimonialCard } from "./TestimonialCard";

export function Testimonials() {
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading eyebrow="Testimonials" title="What clients will say" />
        <DemoNotice className="mx-auto mt-8 max-w-2xl">
          <strong>Placeholders only.</strong> These are not real customer reviews. Genuine, consented testimonials will replace them.
        </DemoNotice>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
