import { getTestimonials } from "../../api/endpoints";
import { useAsync } from "../../hooks/useAsync";
import { SectionHeading } from "../common/SectionHeading";
import { TestimonialCard } from "./TestimonialCard";

export function Testimonials() {
  const { data } = useAsync((s) => getTestimonials(s), []);
  // Nothing to show (or still loading / failed): omit the section rather than show an empty block.
  if (!data || data.length === 0) return null;
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading eyebrow="Testimonials" title="What our clients say" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {data.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      </div>
    </section>
  );
}
