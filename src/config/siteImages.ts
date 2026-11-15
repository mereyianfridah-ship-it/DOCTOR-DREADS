/** Image slots the owner can replace from Admin > Images. Keep in sync with backend/src/lib/siteImages.ts. */
export const SITE_IMAGE_SLOTS = ["hero", "welcome-1", "welcome-2", "about", "cta"] as const;
export type SiteImageSlot = (typeof SITE_IMAGE_SLOTS)[number];

export interface SiteImageSlotInfo {
  slot: SiteImageSlot;
  label: string;
  where: string;
  /** Suggested shape, shown to the owner so uploads crop well. */
  hint: string;
  /** Decorative backgrounds have no alt text. */
  decorative: boolean;
}

export const SITE_IMAGE_INFO: SiteImageSlotInfo[] = [
  { slot: "hero", label: "Hero photo", where: "Big banner at the top of the home page", hint: "Wide (landscape), at least 1600 px across. Keep the subject away from the left side, where the headline sits.", decorative: true },
  { slot: "welcome-1", label: "Welcome photo 1", where: "Home page, “Where Loc Culture Meets Professional Care” (left)", hint: "Portrait (4:5), at least 800 px wide.", decorative: false },
  { slot: "welcome-2", label: "Welcome photo 2", where: "Home page, “Where Loc Culture Meets Professional Care” (right)", hint: "Portrait (4:5), at least 800 px wide.", decorative: false },
  { slot: "about", label: "About page photo", where: "Top of the About page", hint: "Portrait (4:5), at least 800 px wide.", decorative: false },
  { slot: "cta", label: "Booking banner", where: "Background of “Ready to start your loc journey?” near the bottom of the home page", hint: "Wide (landscape), at least 1600 px across. A dark overlay is added on top.", decorative: true },
];
