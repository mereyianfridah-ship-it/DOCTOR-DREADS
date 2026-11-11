import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { PageHeader } from "../components/common/PageHeader";
import { SocialIcon } from "../components/common/SocialIcon";
import { ContactForm } from "../components/contact/ContactForm";
import { siteConfig } from "../config/site";

function Row({ icon, label, text, href }: { icon: ReactNode; label: string; text: string; href: string | null }) {
  return (
    <li className="flex items-start gap-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/20 text-brown">{icon}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/55">{label}</p>
        {href ? <a href={href} className="hover:text-brown">{text}</a> : <p>{text}</p>}
      </div>
    </li>
  );
}

export default function Contact() {
  const { contact, social } = siteConfig;
  return (
    <>
      <PageHeader eyebrow="Contact" title="Get in touch" description="Questions about services, products or booking? Send us a message." />
      <section className="section">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl">Send us a message</h2>
            <div className="mt-6"><ContactForm /></div>
          </div>
          <div>
            <h2 className="text-3xl">Find us</h2>
            <p className="mt-2 text-sm text-charcoal/60">Some contact details are still placeholders and will be replaced by the business.</p>
            <ul className="mt-6 space-y-5">
              <Row icon={<MapPin className="h-5 w-5" />} label="Location" text={siteConfig.location} href={null} />
              <Row icon={<Phone className="h-5 w-5" />} label="Phone" text={contact.phoneDisplay} href={contact.phoneHref} />
              <Row icon={<MessageCircle className="h-5 w-5" />} label="WhatsApp" text={contact.whatsappDisplay} href={contact.whatsappHref} />
              <Row icon={<Mail className="h-5 w-5" />} label="Email" text={contact.emailDisplay} href={contact.emailHref} />
              <Row icon={<Clock className="h-5 w-5" />} label="Hours" text={contact.hours} href={null} />
            </ul>
            <div className="mt-8 flex gap-3">
              {social.map((s) =>
                s.href ? (
                  <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="flex h-11 w-11 items-center justify-center rounded-full border border-charcoal/25 hover:bg-charcoal hover:text-offwhite">
                    <SocialIcon id={s.id} />
                  </a>
                ) : (
                  <span key={s.id} title={`${s.label} link coming soon`} aria-label={`${s.label} (link coming soon)`} className="flex h-11 w-11 items-center justify-center rounded-full border border-charcoal/10 text-charcoal/35">
                    <SocialIcon id={s.id} />
                  </span>
                ),
              )}
            </div>
            <div className="mt-8 flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border border-dashed border-charcoal/25 bg-cream/60 text-center text-charcoal/60">
              <MapPin className="h-8 w-8 text-brown" aria-hidden />
              <p className="mt-2 font-display text-xl text-charcoal">{siteConfig.location}</p>
              <p className="text-sm">Map placeholder: embed a map here later</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
