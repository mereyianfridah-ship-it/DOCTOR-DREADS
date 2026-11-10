import type { Service } from "../types";

/**
 * DEMONSTRATION DATA. Prices are SAMPLE prices until the owner supplies real ones.
 * Set priceFrom to null to show "Request a Quote".
 */
export const SAMPLE_PRICE_NOTE = "Sample price: to be confirmed by Dr Dread Kenya";

export const serviceCategories = [
  "Installation",
  "Retouching",
  "Maintenance",
  "Styling",
  "Natural Hair",
] as const;

export const services: Service[] = [
  {
    slug: "loc-installation",
    name: "Loc Installation",
    category: "Installation",
    shortDescription: "Start your loc journey with a personalised plan built around your hair.",
    description:
      "Every set of locs begins with a conversation. We look at your hair type, length and lifestyle, then agree the loc size, parting pattern and installation method that suit you. Because each installation is different, we start with a consultation rather than a fixed price.",
    benefits: [
      "Personalised sizing and parting plan",
      "Method chosen to suit your hair type and length",
      "Aftercare guidance to help your locs mature well",
      "Free online photo consultation available",
    ],
    image: "/images/service-installation.svg",
    duration: "Duration confirmed after consultation",
    priceFrom: null,
    bookingType: "consultation",
    featured: true,
  },
  {
    slug: "loc-retouching",
    name: "Loc Retouching",
    category: "Retouching",
    shortDescription: "Tidy new growth and keep your roots neat and well-defined.",
    description:
      "Retouching maintains the shape of your locs as your hair grows. We neaten new growth at the root while keeping your locs comfortable and healthy.",
    benefits: [
      "Neat, uniform roots",
      "Gentle on the scalp",
      "Keeps your loc pattern intact",
      "Can be paired with a wash and treatment",
    ],
    image: "/images/service-retouching.svg",
    duration: "Approx. 2–3 hours (placeholder)",
    priceFrom: 2500,
    bookingType: "instant",
    featured: true,
  },
  {
    slug: "loc-maintenance",
    name: "Loc Maintenance",
    category: "Maintenance",
    shortDescription: "Cleansing, conditioning and scalp care to keep locs fresh and healthy.",
    description:
      "A regular maintenance session keeps your scalp clean and your locs hydrated. Ideal between retouching appointments.",
    benefits: [
      "Deep cleanse for scalp and locs",
      "Moisture and conditioning",
      "Lint and build-up management",
      "Personal product recommendations",
    ],
    image: "/images/service-maintenance.svg",
    duration: "Approx. 1.5–2 hours (placeholder)",
    priceFrom: 1800,
    bookingType: "instant",
    featured: true,
  },
  {
    slug: "loc-styling",
    name: "Loc Styling",
    category: "Styling",
    shortDescription: "Updos, braids, curls and statement styles for everyday and special occasions.",
    description:
      "From clean everyday updos to creative event styles, we style your locs to suit the moment. Bring inspiration photos to your appointment.",
    benefits: [
      "Styles for everyday and events",
      "Inspiration-led planning",
      "Hold-and-finish products applied with care",
      "Tips to make your style last",
    ],
    image: "/images/service-styling.svg",
    duration: "Approx. 1–2 hours (placeholder)",
    priceFrom: 1500,
    bookingType: "instant",
    featured: true,
  },
  {
    slug: "natural-hair-services",
    name: "Natural Hair Services",
    category: "Natural Hair",
    shortDescription: "Wash, treat and style natural hair with a gentle, healthy-hair approach.",
    description:
      "For clients who are not wearing locs, we offer natural hair care focused on cleansing, moisture and protective styling.",
    benefits: [
      "Gentle cleansing and conditioning",
      "Moisture-focused treatments",
      "Protective styling options",
      "Advice for your routine at home",
    ],
    image: "/images/service-natural.svg",
    duration: "Approx. 1.5–2.5 hours (placeholder)",
    priceFrom: 1500,
    bookingType: "instant",
    featured: true,
  },
  {
    slug: "loc-repair",
    name: "Loc Repair & Reconstruction",
    category: "Maintenance",
    shortDescription: "Assessment and repair for thinning, breaking or damaged locs.",
    description:
      "Repair work depends on the condition of each loc, so we assess first. You'll receive a recommended plan and a quote after consultation.",
    benefits: [
      "Honest assessment of your locs",
      "Targeted repair plan",
      "Guidance to prevent future damage",
    ],
    image: "/images/gallery-3.svg",
    duration: "Duration confirmed after consultation",
    priceFrom: null,
    bookingType: "consultation",
  },
  {
    slug: "event-loc-styling",
    name: "Event & Occasion Styling",
    category: "Styling",
    shortDescription: "Special-occasion looks for weddings, graduations and photoshoots.",
    description:
      "A tailored styling plan for your event. Mobile service may be available subject to confirmation.",
    benefits: [
      "Planned around your outfit and event",
      "Mobile service option",
      "Trial styling can be discussed",
    ],
    image: "/images/gallery-5.svg",
    duration: "Approx. 2–3 hours (placeholder)",
    priceFrom: 3500,
    bookingType: "instant",
  },
  {
    slug: "natural-hair-treatment",
    name: "Natural Hair Treatment",
    category: "Natural Hair",
    shortDescription: "Deep conditioning and scalp treatment for dry or stressed hair.",
    description:
      "A restorative treatment to bring moisture back to dry hair and calm the scalp.",
    benefits: ["Deep conditioning", "Scalp care", "Take-home care advice"],
    image: "/images/gallery-4.svg",
    duration: "Approx. 1 hour (placeholder)",
    priceFrom: 1200,
    bookingType: "instant",
  },
];

export const getService = (slug: string) => services.find((s) => s.slug === slug);
export const instantServices = services.filter((s) => s.bookingType === "instant");
