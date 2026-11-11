import { getTestimonials } from "../../api/endpoints";
import { useAsync } from "../../hooks/useAsync";
import { DemoNotice } from "../common/DemoNotice";
import { SectionHeading } from "../common/SectionHeading";
import { TestimonialCard } from "./TestimonialCard";

export function Testimonials() {
  const { data } = useAsync((s) => getTestimonials(s), []);
  // Nothing to show (or still loading / failed): omit the section rather than show an empty block.
  if (!data || data.length === 0) return null;
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading eyebrow="Testimonials" title="What clients will say" />
        <DemoNotice className="mx-auto mt-8 max-w-2xl">
          <strong>Placeholders only.</strong> These are not real customer reviews. Genuine, consented testimonials will replace them.
        </DemoNotice>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {data.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
