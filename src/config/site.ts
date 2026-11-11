/**
 * Brand-level configuration that the backend does not yet serve.
 * Booking rules, delivery areas and stylists now come from the API (GET /api/config).
 *
 * Every value marked PLACEHOLDER must be replaced with real business details (see
 * MANUAL_CONFIGURATION_REQUIRED.md). Nothing in this file is an official Dr Dread Kenya contact detail.
 */
export const siteConfig = {
  name: "Dr Dread Kenya",
  shortName: "Dr Dread",
  tagline: "Dreadlocks & natural hair care",
  location: "Rongai, Kenya",
  contact: {
    phoneDisplay: "+254 000 000 000 (placeholder)",
    phoneHref: null as string | null, // e.g. "tel:+254700000000"
    whatsappDisplay: "WhatsApp number (placeholder)",
    whatsappHref: null as string | null, // e.g. "https://wa.me/254700000000"
    emailDisplay: "hello@example.com (placeholder)",
    emailHref: null as string | null, // e.g. "mailto:hello@drdread.co.ke"
    hours: "Opening hours to be confirmed",
  },
  social: [
    { id: "instagram", label: "Instagram", href: null as string | null },
    { id: "facebook", label: "Facebook", href: null as string | null },
    { id: "tiktok", label: "TikTok", href: null as string | null },
  ],
};
