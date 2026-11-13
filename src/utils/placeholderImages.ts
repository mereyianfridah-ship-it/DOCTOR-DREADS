/**
 * AI-generated placeholder images for Dr Dread Kenya.
 *
 * Uses Pollinations.ai (free text-to-image) to generate beautiful, on-theme
 * placeholder photos while real photography is being prepared. Each prompt is
 * tailored to a specific part of the site so the placeholders feel intentional
 * and premium rather than generic.
 *
 * Replace these URLs with real image paths once client photos are available.
 */

const POLLINATIONS = "https://image.pollinations.ai/prompt";

/** Build a Pollinations image URL from a prompt with size and quality options. */
function aiImage(prompt: string, opts?: { width?: number; height?: number; seed?: number }) {
  const encoded = encodeURIComponent(prompt);
  const params: string[] = [];
  if (opts?.width) params.push(`width=${opts.width}`);
  if (opts?.height) params.push(`height=${opts.height}`);
  if (opts?.seed) params.push(`seed=${opts.seed}`);
  const query = params.length ? `?${params.join("&")}` : "";
  return `${POLLINATIONS}/${encoded}${query}`;
}

/** Dreadlocks / locs styles - gallery, hero, before-after */
export const locsImage = (seed?: number) =>
  aiImage("beautiful dreadlocks hairstyle, locs, natural hair, professional salon, soft daylight, high quality, photorealistic, 8k", {
    width: 800,
    height: 1000,
    seed,
  });

/** Braids and twists - gallery */
export const braidsImage = (seed?: number) =>
  aiImage("beautiful braided hairstyle, box braids, natural hair, salon, soft lighting, photorealistic, high quality", {
    width: 800,
    height: 1000,
    seed,
  });

/** Salon interior / about page */
export const salonImage = (seed?: number) =>
  aiImage("modern dreadlocks salon interior, welcoming, natural wood, soft warm lighting, professional hair studio, photorealistic, high quality", {
    width: 800,
    height: 600,
    seed,
  });

/** Hair care products - shop, product cards */
export const productImage = (seed?: number) =>
  aiImage("natural hair care products, moisturizer, oil, gel, organic ingredients, shelf display, soft studio lighting, photorealistic, high quality", {
    width: 600,
    height: 600,
    seed,
  });

/** Client avatar / testimonial portrait */
export const avatarImage = (seed?: number) =>
  aiImage("beautiful woman portrait, natural hair, professional headshot, soft lighting, photorealistic, high quality", {
    width: 400,
    height: 400,
    seed,
  });

/** Service hero images - installation, retouching, maintenance, styling */
export const serviceImage = (seed?: number) =>
  aiImage("dreadlocks salon service, stylist working on client hair, professional, soft lighting, photorealistic, high quality", {
    width: 800,
    height: 600,
    seed,
  });

/** Generic fallback for any missing image */
export const fallbackImage = (seed?: number) =>
  aiImage("natural hair care, dreadlocks, salon, beautiful, soft lighting, photorealistic, high quality", {
    width: 600,
    height: 600,
    seed,
  });

/**
 * Returns an AI placeholder image URL based on a product category.
 * Falls back to a generic natural-hair image when the category is unknown.
 */
export function placeholderForCategory(category: string, seed?: number): string {
  const c = category.toLowerCase();
  if (c.includes("oil") || c.includes("gel") || c.includes("moistur") || c.includes("product") || c.includes("care")) {
    return productImage(seed);
  }
  if (c.includes("access") || c.includes("acc")) {
    return productImage(seed);
  }
  return fallbackImage(seed);
}

/**
 * Returns an AI placeholder image URL based on a gallery category.
 */
export function placeholderForGallery(category: string, seed?: number): string {
  const c = category.toLowerCase();
  if (c.includes("braid") || c.includes("twist")) return braidsImage(seed);
  return locsImage(seed);
}
