/**
 * Real photos for the slots that still use bundled SVG placeholders.
 *
 * Photos live in /public/images/photos/<slot>.jpg and are downloaded once with
 *   PEXELS_API_KEY=xxxx npm run photos        (see scripts/fetch-photos.mjs)
 * They are served by your own site: stable, fast, and matched to each slot by search query.
 * You can also drop your own <slot>.jpg into that folder to override any photo.
 *
 * If a photo file is missing, PreviewImage falls back to the original SVG, so nothing breaks.
 * Turn this off entirely (SVGs only) with VITE_PREVIEW_IMAGES=false.
 */

export const PREVIEW_ENABLED = import.meta.env.VITE_PREVIEW_IMAGES !== "false";

const photo = (slot: string) => `/images/photos/${slot}.jpg`;

/** Small stable hash so the same record always gets the same photo. */
function pick(seed: string | number, count: number): number {
  const s = String(seed);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % count) + 1;
}

/** Bundled SVG file name (no extension) -> photo slot. */
const BUNDLED: Record<string, string> = {
  hero: "hero",
  about: "about",
  "about-2": "about-2",
  "service-installation": "service-installation",
  "service-retouching": "service-retouching",
  "service-maintenance": "service-maintenance",
  "service-styling": "service-styling",
  "service-natural": "service-natural",
  "product-moisturizer-1": "product-moisturizer-1",
  "product-moisturizer-2": "product-moisturizer-2",
  "product-moisturizer-3": "product-moisturizer-3",
  "product-gel-1": "product-gel-1",
  "product-gel-2": "product-gel-2",
  "product-gel-3": "product-gel-3",
  "product-oil-1": "product-oil-1",
  "product-oil-2": "product-oil-2",
  "product-oil-3": "product-oil-3",
  "product-acc-1": "product-comb",
  "product-acc-2": "product-bonnet",
  "product-acc-3": "product-headband",
  "gallery-1": "gallery-locs-1",
  "gallery-2": "gallery-locs-2",
  "gallery-3": "gallery-salon-1",
  "gallery-4": "gallery-natural-1",
  "gallery-5": "gallery-locs-3",
  "gallery-6": "gallery-locs-4",
  "gallery-7": "gallery-salon-2",
  "gallery-8": "gallery-locs-5",
  "gallery-9": "gallery-natural-2",
};

const BUNDLED_RE = /^\/images\/([\w-]+)\.svg$/;

/** True when `src` is one of the bundled SVG placeholders. */
export function isBundledPlaceholder(src?: string | null): src is string {
  return !!src && BUNDLED_RE.test(src);
}

/** Photo path for a bundled placeholder, or the input unchanged when preview is off / not a placeholder. */
export function previewSrc(src: string): string;
export function previewSrc(src: string | null | undefined): string | undefined;
export function previewSrc(src: string | null | undefined): string | undefined {
  if (!src) return src ?? undefined;
  if (!PREVIEW_ENABLED) return src;
  const m = BUNDLED_RE.exec(src);
  const slot = m ? BUNDLED[m[1]] : undefined;
  return slot ? photo(slot) : src;
}

const SERVICE_SLOTS: Record<string, string> = {
  "loc-installation": "service-installation",
  "loc-retouching": "service-retouching",
  "loc-maintenance": "service-maintenance",
  "loc-styling": "service-styling",
  "natural-hair-services": "service-natural",
  "loc-repair": "service-repair",
  "event-loc-styling": "service-event",
  "natural-hair-treatment": "service-treatment",
};

export function serviceImage(slug: string): string {
  return photo(SERVICE_SLOTS[slug] ?? "service-installation");
}

/** Pick the photo from the product name first (comb, bonnet, castor ...), then the category. */
export function productImage(category: string, name = "", variant = ""): string {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  const v = variant || n || c;
  if (n.includes("comb")) return photo("product-comb");
  if (n.includes("bonnet") || n.includes("scarf")) return photo("product-bonnet");
  if (n.includes("headband")) return photo("product-headband");
  if (n.includes("oil")) return photo(`product-oil-${pick(v, 3)}`);
  if (n.includes("gel") || n.includes("edge") || n.includes("wax")) return photo(`product-gel-${pick(v, 3)}`);
  if (/(lotion|cream|butter|moistur)/.test(n)) return photo(`product-moisturizer-${pick(v, 3)}`);
  if (c.includes("oil")) return photo(`product-oil-${pick(v, 3)}`);
  if (c.includes("gel")) return photo(`product-gel-${pick(v, 3)}`);
  if (c.includes("accessor")) return photo(["product-comb", "product-bonnet", "product-headband"][pick(v, 3) - 1]);
  return photo(`product-moisturizer-${pick(v, 3)}`);
}

export function galleryImage(category: string, seed: number | string = 0): string {
  const c = category.toLowerCase();
  if (c.includes("natural")) return photo(`gallery-natural-${pick(seed, 3)}`);
  if (c.includes("salon")) return photo(`gallery-salon-${pick(seed, 3)}`);
  if (c.includes("braid")) return photo(`gallery-braids-${pick(seed, 3)}`);
  return photo(`gallery-locs-${pick(seed, 5)}`);
}

export const avatarImage = (seed: number | string = 0) => photo(`avatar-${pick(seed, 4)}`);
export const salonImage = (seed: number | string = 0) => photo(`gallery-salon-${pick(seed, 3)}`);
export const locsImage = (seed: number | string = 0) => photo(`gallery-locs-${pick(seed, 5)}`);
export const braidsImage = (seed: number | string = 0) => photo(`gallery-braids-${pick(seed, 3)}`);
export const fallbackImage = (seed: number | string = 0) => photo(`gallery-locs-${pick(seed, 5)}`);
export const placeholderForCategory = (category: string, name = "") => productImage(category, name);
export const placeholderForGallery = (category: string, seed: number | string = 0) => galleryImage(category, seed);
