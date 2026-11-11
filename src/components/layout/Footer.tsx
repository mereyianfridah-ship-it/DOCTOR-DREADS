import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { siteConfig } from "../../config/site";
import { useCatalog } from "../../context/CatalogContext";
import { SocialIcon } from "../common/SocialIcon";
import { BrandMark } from "./BrandMark";

const quickLinks = [
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/shop", label: "Shop" },
  { to: "/gallery", label: "Gallery" },
  { to: "/booking", label: "Book Appointment" },
  { to: "/contact", label: "Contact" },
];

function ContactLine({ text, href }: { text: string; href: string | null }) {
  return href ? (
    <a href={href} className="hover:text-gold">
      {text}
    </a>
  ) : (
    <span>{text}</span>
  );
}

export function Footer() {
  const { contact, social } = siteConfig;
  const { services } = useCatalog();
  return (
    <footer className="bg-charcoal text-cream/80">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandMark light />
          <p className="mt-5 max-w-xs text-sm leading-relaxed">
            Dreadlocks services and natural hair-care essentials in {siteConfig.location}.
          </p>
          <ul className="mt-6 flex gap-3">
            {social.map((s) => (
              <li key={s.id}>
                {s.href ? (
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/30 hover:border-gold hover:text-gold"
                  >
                    <SocialIcon id={s.id} />
                  </a>
                ) : (
                  <span
                    title={`${s.label} link coming soon`}
                    aria-label={`${s.label} (link coming soon)`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-cream/15 text-cream/40"
                  >
                    <SocialIcon id={s.id} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gold">Explore</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {quickLinks.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-gold">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gold">Services</h3>
          <ul className="mt-5 space-y-3 text-sm">
            {services.slice(0, 5).map((s) => (
              <li key={s.slug}>
                <Link to={`/services/${s.slug}`} className="hover:text-gold">
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-[0.25em] text-gold">Visit &amp; Contact</h3>
          <ul className="mt-5 space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" aria-hidden />
              {siteConfig.location}
            </li>
            <li><ContactLine text={contact.phoneDisplay} href={contact.phoneHref} /></li>
            <li><ContactLine text={contact.whatsappDisplay} href={contact.whatsappHref} /></li>
            <li><ContactLine text={contact.emailDisplay} href={contact.emailHref} /></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-cream/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs sm:flex-row">
          <p>© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-gold">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-gold">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
