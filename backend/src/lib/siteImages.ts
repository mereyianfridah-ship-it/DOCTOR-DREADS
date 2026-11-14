/** The image slots the owner can replace from the admin. Keep in sync with src/config/siteImages.ts in the frontend. */
export const SITE_IMAGE_SLOTS = ["hero", "welcome-1", "welcome-2", "about", "cta"] as const;
export type SiteImageSlot = (typeof SITE_IMAGE_SLOTS)[number];
export const isSiteImageSlot = (s: string): s is SiteImageSlot => (SITE_IMAGE_SLOTS as readonly string[]).includes(s);
