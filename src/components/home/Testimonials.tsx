import { useState } from "react";
import { getTestimonials } from "../../api/endpoints";
import { useAsync } from "../../hooks/useAsync";
import { Button } from "../common/Button";
import { SectionHeading } from "../common/SectionHeading";
import { ReviewForm } from "./ReviewForm";
import { TestimonialCard } from "./TestimonialCard";

export function Testimonials() {
  const { data } = useAsync((s) => getTestimonials(s), []);
  const [formOpen, setFormOpen] = useState(false);
  const reviews = data ?? [];
  const hasReviews = reviews.length > 0;
  return (
    <section className="section">
      <div className="container-page">
        <SectionHeading
          eyebrow={hasReviews ? "Testimonials" : "Reviews"}
          title={hasReviews ? "What our clients say" : "Been to see us?"}
          description={hasReviews ? undefined : "We'd love to hear how your visit went."}
        />
        {hasReviews && (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {reviews.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        )}
        <div className="mt-10 text-center">
          {!formOpen && (
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              Share your experience
            </Button>
          )}
        </div>
        {formOpen && <ReviewForm />}
      </div>
    </section>
  );
}
