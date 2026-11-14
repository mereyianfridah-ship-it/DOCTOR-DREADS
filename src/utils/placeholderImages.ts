/**
 * AI-generated placeholder images for Dr Dread Kenya.
 *
 * Primary source: LoremFlickr (free, real photos from Flickr, no API key).
 *   URL: https://loremflickr.com/{w}/{h}/{tags}?random={n}
 * Fallback: Picsum Photos (free random photos, no API key).
 *
 * Replace these URLs with real image paths once client photos are available.
 */

const LOREMFLICKR = "https://loremflickr.com";

function rand() {
  return Math.floor(Math.random() * 100000);
}

function lf(w: number, h: number, tags: string): string {
  return `${LOREMFLICKR}/${w}/${h}/${tags}?random=${rand()}`;
}

export function serviceImage(slug: string): string {
  const tags: Record<string, string> = {
    "loc-installation": "dreadlocks,locs,hair,salon",
    "loc-retouching": "dreadlocks,locs,hair,salon",
    "loc-maintenance": "dreadlocks,locs,hair,salon",
    "loc-styling": "dreadlocks,locs,hair,braids",
    "natural-hair-services": "natural hair,hair,salon",
    "loc-repair": "dreadlocks,locs,hair,salon",
    "event-loc-styling": "dreadlocks,locs,hair,event",
    "natural-hair-treatment": "natural hair,hair,salon",
  };
  return lf(800, 1000, tags[slug] ?? "dreadlocks,locs,hair,salon");
}

export function productImage(category: string): string {
  const c = category.toLowerCase();
  const tags: Record<string, string> = {
    moisturizers: "hair products,cream,lotion,beauty",
    "moulding gels": "hair gel,styling products,beauty",
    "natural oils": "hair oil,beauty products,natural",
    accessories: "hair accessories,comb,bonnet,beauty",
  };
  const key = Object.keys(tags).find((k) => c.includes(k));
  return lf(600, 600, tags[key ?? "moisturizers"]);
}

export function galleryImage(category: string): string {
  const c = category.toLowerCase();
  const tags: Record<string, string> = {
    "loc styles": "dreadlocks,locs,hair,portrait",
    transformations: "dreadlocks,locs,hair,transformation",
    "natural hair": "natural hair,hair,portrait",
    salon: "salon,beauty,hair studio,interior",
    videos: "dreadlocks,locs,hair,salon",
  };
  const key = Object.keys(tags).find((k) => c.includes(k));
  return lf(800, 1000, tags[key ?? "loc styles"]);
}

export function avatarImage(seed?: number): string {
  return lf(400, 400, `portrait,Black woman,hair${seed ? `,lock=${seed}` : ""}`);
}

export function salonImage(seed?: number): string {
  return lf(800, 600, `salon,beauty,hair studio,interior${seed ? `,lock=${seed}` : ""}`);
}

export function locsImage(seed?: number): string {
  return lf(800, 1000, `dreadlocks,locs,hair,portrait${seed ? `,lock=${seed}` : ""}`);
}

export function braidsImage(seed?: number): string {
  return lf(800, 1000, `braids,hair,portrait${seed ? `,lock=${seed}` : ""}`);
}

export function fallbackImage(seed?: number): string {
  return lf(600, 600, `dreadlocks,locs,hair,salon${seed ? `,lock=${seed}` : ""}`);
}

export function placeholderForCategory(category: string, seed?: number): string {
  return productImage(category);
}

export function placeholderForGallery(category: string, seed?: number): string {
  return galleryImage(category);
}