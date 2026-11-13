/**
 * Brand-level configuration that the backend does not yet serve.
 * Booking rules, delivery areas and stylists now come from the API (GET /api/config).
 *
 * Contact fields are intentionally EMPTY until the owner supplies real details (see
 * MANUAL_CONFIGURATION_REQUIRED.md). Empty fields are hidden from the site. Set both the
 * *Display text and the *Href together, e.g. phoneDisplay "+254 7xx xxx xxx" and phoneHref "tel:+2547xxxxxxxx".
 */
export const siteConfig = {
  name: "Dr Dread Kenya",
  shortName: "Dr Dread",
  tagline: "Dreadlocks & natural hair care",
  location: "Rongai, Kenya",
  contact: {
    phoneDisplay: "",
    phoneHref: null as string | null, // e.g. "tel:+254700000000"
    whatsappDisplay: "",
    whatsappHref: null as string | null, // e.g. "https://wa.me/254700000000"
    emailDisplay: "",
    emailHref: null as string | null, // e.g. "mailto:hello@drdread.co.ke"
    hours: "",
  },
  social: [
    { id: "instagram", label: "Instagram", href: null as string | null },
    { id: "facebook", label: "Facebook", href: null as string | null },
    { id: "tiktok", label: "TikTok", href: null as string | null },
  ],
};
