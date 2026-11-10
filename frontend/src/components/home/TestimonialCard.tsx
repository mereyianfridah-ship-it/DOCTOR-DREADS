import { Quote } from "lucide-react";
import type { Testimonial } from "../../types";

export function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <figure className="flex h-full flex-col rounded-2xl border border-charcoal/10 bg-white p-8">
      <Quote className="h-8 w-8 text-gold" aria-hidden />
      <blockquote className="mt-4 flex-1 text-base leading-relaxed text-charcoal/80">{t.quote}</blockquote>
      <figcaption className="mt-6 border-t border-charcoal/10 pt-4">
        <p className="font-semibold">{t.name}</p>
        <p className="text-sm text-charcoal/60">{t.detail}</p>
      </figcaption>
    </figure>
  );
}
