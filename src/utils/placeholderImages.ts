/**
 * Developer preview photos for Dr Dread Kenya.
 *
 * While the client's real photography is pending, every bundled placeholder
 * (`/images/*.svg`) is swapped for a real photo that matches its slot
 * (hero, loc styles, salon, moisturizers, oils, ...).
 *
 * Source: LoremFlickr (real Flickr photos by tag, no API key).
 *   https://loremflickr.com/{w}/{h}/{tags}?lock={n}
 * `lock` makes the photo STABLE: the same slot always shows the same image
 * (no flicker, no new photo on every re-render).
 *
 * Turn the preview off (use the bundled SVGs only) with:  VITE_PREVIEW_IMAGES=false
 * When real client images exist, put them in /public/images (or upload them via the
 * admin) and give them non-"/images/*.svg" paths or set the flag to false.
 * If a preview photo fails to load, the component falls back to the original SVG.
 */

export const PREVIEW_ENABLED = import.meta.env.VITE_PREVIEW_IMAGES !== "false";

const LOREMFLICKR = "https://loremflickr.com";

/** Small stable string hash so each slot gets its own fixed photo. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 9000) + 1;
}

function lf(w: number, h: number, tags: string, lockKey: string | number): string {
  const lock = typeof lockKey === "number" ? lockKey : hash(lockKey);
  return `${LOREMFLICKR}/${w}/${h}/${tags}?lock=${lock}`;
}

const LOCS = "dreadlocks,locs";
const NATURAL = "natural hair,afro";
const SALON = "hair salon,salon";

/** Bundled placeholder file name (no extension) -> [width, height, tags]. */
const BUNDLED: Record<string, [number, number, string]> = {
  hero: [1600, 900, "dreadlocks,locs,hairstylist"],
  about: [800, 1000, SALON],
  "about-2": [800, 1000, LOCS],

  "service-installation": [800, 1000, LOCS],
  "service-retouching": [800, 1000, "dreadlocks,hairstylist"],
  "service-maintenance": [800, 1000, "dreadlocks,hair care"],
  "service-styling": [800, 1000, "dreadlocks,updo"],
  "service-natural": [800, 1000, NATURAL],

  "product-moisturizer-1": [600, 600, "hair cream,moisturizer"],
  "product-moisturizer-2": [600, 600, "body lotion,cosmetic"],
  "product-moisturizer-3": [600, 600, "cosmetic jar,skincare"],
  "product-gel-1": [600, 600, "hair gel,pomade"],
  "product-gel-2": [600, 600, "hair wax,pomade"],
  "product-gel-3": [600, 600, "hair gel,cosmetic"],
  "product-oil-1": [600, 600, "hair oil,oil bottle"],
  "product-oil-2": [600, 600, "essential oil,dropper bottle"],
  "product-oil-3": [600, 600, "castor oil,oil bottle"],
  "product-acc-1": [600, 600, "hair comb,comb"],
  "product-acc-2": [600, 600, "satin bonnet,hair accessories"],
  "product-acc-3": [600, 600, "headband,hair accessories"],

  "gallery-1": [800, 1000, LOCS],
  "gallery-2": [800, 1000, LOCS],
  "gallery-3": [800, 1000, SALON],
  "gallery-4": [800, 1000, NATURAL],
  "gallery-5": [800, 1000, LOCS],
  "gallery-6": [800, 1000, LOCS],
  "gallery-7": [800, 1000, "salon interior,barber"],
  "gallery-8": [800, 1000, LOCS],
  "gallery-9": [800, 1000, NATURAL],
};

const BUNDLED_RE = /^\/images\/([\w-]+)\.svg$/;

/** True when `src` is one of the bundled SVG placeholders. */
export function isBundledPlaceholder(src?: string | null): src is string {
  return !!src && BUNDLED_RE.test(src);
}

/**
 * Real-photo preview URL for a bundled placeholder path, or the input unchanged
 * when the preview is off / the path is a real (non-placeholder) image.
 */
export function previewSrc(src: string): string;
export function previewSrc(src: string | null | undefined): string | undefined;
export function previewSrc(src: string | null | undefined): string | undefined {
  if (!src) return src ?? undefined;
  if (!PREVIEW_ENABLED) return src;
  const m = BUNDLED_RE.exec(src);
  const entry = m ? BUNDLED[m[1]] : undefined;
  if (!entry) return src;
  return lf(entry[0], entry[1], entry[2], `${m![1]}`);
}

/* ------------------------------------------------------------------ */
/* Slot-specific helpers (description-matched, stable per slot)        */
/* ------------------------------------------------------------------ */

export function serviceImage(slug: string): string {
  const tags: Record<string, string> = {
    "loc-installation": LOCS,
    "loc-retouching": "dreadlocks,hairstylist",
    "loc-maintenance": "dreadlocks,hair care",
    "loc-styling": "dreadlocks,updo",
    "natural-hair-services": NATURAL,
    "loc-repair": "dreadlocks,hairstylist,salon",
    "event-loc-styling": "dreadlocks,wedding,hairstyle",
    "natural-hair-treatment": "natural hair,hair treatment",
  };
  return lf(800, 1000, tags[slug] ?? LOCS, `service-${slug}`);
}

/** Pick product tags from the product name first (comb, bonnet, castor ...), then category. */
export function productImage(category: string, name = "", variant = ""): string {
  const n = name.toLowerCase();
  const c = category.toLowerCase();
  const byName: [string, string][] = [
    ["comb", "hair comb,comb"],
    ["bonnet", "satin bonnet,hair accessories"],
    ["headband", "headband,hair accessories"],
    ["castor", "castor oil,oil bottle"],
    ["edge", "hair gel,pomade"],
    ["gel", "hair gel,pomade"],
    ["oil", "hair oil,oil bottle"],
    ["lotion", "body lotion,cosmetic"],
    ["cream", "hair cream,moisturizer"],
    ["butter", "hair cream,moisturizer"],
  ];
  const byCategory: [string, string][] = [
    ["moisturizer", "hair cream,moisturizer"],
    ["gel", "hair gel,pomade"],
    ["oil", "hair oil,oil bottle"],
    ["accessor", "hair accessories,hair comb"],
  ];
  const tags =
    byName.find(([k]) => n.includes(k))?.[1] ??
    byCategory.find(([k]) => c.includes(k))?.[1] ??
    "hair products,cosmetic";
  return lf(600, 600, tags, `product-${n || c}-${variant}`);
}

export function galleryImage(category: string, seed: number | string = 0): string {
  const c = category.toLowerCase();
  const tags = c.includes("natural")
    ? NATURAL
    : c.includes("salon")
      ? SALON
      : c.includes("braid")
        ? "braids,hairstyle"
        : LOCS;
  return lf(800, 1000, tags, `gallery-${c}-${seed}`);
}

export function avatarImage(seed: number | string = 0): string {
  return lf(400, 400, "portrait,woman,smile", `avatar-${seed}`);
}

export function salonImage(seed: number | string = 0): string {
  return lf(800, 1000, SALON, `salon-${seed}`);
}

export function locsImage(seed: number | string = 0): string {
  return lf(800, 1000, LOCS, `locs-${seed}`);
}

export function braidsImage(seed: number | string = 0): string {
  return lf(800, 1000, "braids,hairstyle", `braids-${seed}`);
}

export function fallbackImage(seed: number | string = 0): string {
  return lf(600, 600, "dreadlocks,hair", `fallback-${seed}`);
}

export function placeholderForCategory(category: string, name = ""): string {
  return productImage(category, name);
}

export function placeholderForGallery(category: string, seed: number | string = 0): string {
  return galleryImage(category, seed);
}
