import { SocialIcon } from "./SocialIcon";
import { useBusiness } from "../../hooks/useBusiness";

export interface Channel { id: string; label: string; href: string; external: boolean; color: string }

const WA_MESSAGE = "Hello Dr Dread, I'd like to ask about an appointment.";

/** Every channel the owner has set, in tap-priority order. Unset ones are left out. */
export function useChannels(): Channel[] {
  const { contact, social } = useBusiness();
  const out: Channel[] = [];
  if (contact.whatsappHref)
    out.push({ id: "whatsapp", label: "WhatsApp", href: `${contact.whatsappHref}?text=${encodeURIComponent(WA_MESSAGE)}`, external: true, color: "#25D366" });
  if (contact.phoneHref) out.push({ id: "phone", label: "Call", href: contact.phoneHref, external: false, color: "#8B5E3C" });
  if (contact.emailHref) out.push({ id: "email", label: "Email", href: contact.emailHref, external: false, color: "#5B4636" });
  const brand: Record<string, string> = { instagram: "#E4405F", facebook: "#1877F2", tiktok: "#111111" };
  for (const s of social) if (s.href) out.push({ id: s.id, label: s.label, href: s.href, external: true, color: brand[s.id] ?? "#333333" });
  return out;
}

const ext = (c: Channel) => (c.external ? { target: "_blank", rel: "noopener noreferrer" } : {});

/** Big tap-to-contact buttons (logo + name) for the Contact page. */
export function ContactButtons() {
  const channels = useChannels();
  if (channels.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Contact us">
      {channels.map((c) => (
        <li key={c.id}>
          <a
            href={c.href}
            {...ext(c)}
            style={{ backgroundColor: c.color }}
            className="flex min-h-[3.5rem] items-center justify-center gap-3 rounded-2xl px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:brightness-110 focus-visible:outline-offset-4"
          >
            <SocialIcon id={c.id} className="h-6 w-6" /> {c.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Round brand-coloured logo buttons for the footer. */
export function ContactIcons() {
  const channels = useChannels();
  if (channels.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-3">
      {channels.map((c) => (
        <li key={c.id}>
          <a
            href={c.href}
            {...ext(c)}
            aria-label={c.label}
            title={c.label}
            style={{ backgroundColor: c.color }}
            className="flex h-11 w-11 items-center justify-center rounded-full text-white ring-1 ring-cream/30 transition hover:scale-105 hover:brightness-110"
          >
            <SocialIcon id={c.id} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Floating WhatsApp button, visible on every page; renders nothing until a WhatsApp number is set. */
export function WhatsAppFloat() {
  const wa = useChannels().find((c) => c.id === "whatsapp");
  if (!wa) return null;
  return (
    <a
      href={wa.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      style={{ backgroundColor: wa.color, bottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
      className="fixed right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105"
    >
      <SocialIcon id="whatsapp" className="h-8 w-8" />
    </a>
  );
}
