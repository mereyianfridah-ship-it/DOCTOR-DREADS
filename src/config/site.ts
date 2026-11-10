/**
 * Central, editable business configuration.
 * Every value marked PLACEHOLDER must be replaced with real business details.
 * Nothing in this file is an official Dr Dread Kenya contact detail.
 */
export const siteConfig = {
  name: "Dr Dread Kenya",
  shortName: "Dr Dread",
  tagline: "Dreadlocks & natural hair care",
  location: "Rongai, Kenya",
  // PLACEHOLDER contact details (set to a real value to turn them into live links)
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
  booking: {
    // Days of week the salon accepts bookings (0 = Sunday)
    openDays: [1, 2, 3, 4, 5, 6],
    slots: ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"],
    advanceDays: 45,
    depositPercent: 30, // PLACEHOLDER policy
    inPersonConsultationFee: null as number | null, // KSh, configurable. null = "to be confirmed"
    onlineConsultationFree: true, // subject to the business's stated policy
  },
  checkout: {
    // PLACEHOLDER delivery charges (KSh)
    deliveryAreas: [
      { id: "rongai", label: "Rongai", fee: 200 },
      { id: "ngong", label: "Ngong / Kiserian", fee: 300 },
      { id: "nairobi", label: "Nairobi (other areas)", fee: 400 },
      { id: "outside", label: "Outside Nairobi (courier)", fee: 600 },
    ],
    collectionLabel: "Collect from Rongai (paid online first)",
  },
};

export const stylists = [
  { id: "auto", name: "Assign automatically", note: "We'll match you with an available stylist" },
  { id: "stylist-a", name: "Stylist A (demo)", note: "Placeholder profile" },
  { id: "stylist-b", name: "Stylist B (demo)", note: "Placeholder profile" },
];
