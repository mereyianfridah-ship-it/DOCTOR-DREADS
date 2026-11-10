import { Heart, Leaf, MessageCircle, ShieldCheck } from "lucide-react";
import { SectionHeading } from "../common/SectionHeading";

/** EDITABLE content: keep claims factual. */
const reasons = [
  { icon: MessageCircle, title: "Consultation first", text: "We start by understanding your hair and goals, so plans are personal rather than one-size-fits-all." },
  { icon: Leaf, title: "Healthy-hair focus", text: "Our approach to locs and natural hair is centred on scalp comfort, moisture and long-term hair health." },
  { icon: Heart, title: "Salon & mobile", text: "Visit us in Rongai or ask about a mobile service, subject to availability." },
  { icon: ShieldCheck, title: "Care beyond the chair", text: "Aftercare guidance and hair-care products to help you look after your locs at home." },
];

export function WhyChoose() {
  return (
    <section className="section bg-charcoal">
      <div className="container-page">
        <SectionHeading light eyebrow="Why Dr Dread Kenya" title="A considered approach to loc care" />
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-cream/15 p-7 transition hover:border-gold/60">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
                <Icon className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="text-xl text-offwhite">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-cream/75">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
