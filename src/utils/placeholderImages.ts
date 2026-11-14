/**
 * AI-generated placeholder images for Dr Dread Kenya.
 * Uses Pollinations.ai (free text-to-image) for photorealistic placeholders.
 * Replace with real image paths once client photos are available.
 */

const POLLINATIONS = "https://image.pollinations.ai/prompt";

function aiImage(prompt: string, opts?: { width?: number; height?: number; seed?: number }) {
  const encoded = encodeURIComponent(prompt);
  const params: string[] = [];
  if (opts?.width) params.push(`width=${opts.width}`);
  if (opts?.height) params.push(`height=${opts.height}`);
  if (opts?.seed) params.push(`seed=${opts.seed}`);
  const query = params.length ? `?${params.join("&")}` : "";
  return `${POLLINATIONS}/${encoded}${query}`;
}

export function serviceImage(slug: string): string {
  const prompts: Record<string, string> = {
    "loc-installation":
      "photorealistic portrait of a Black woman with beautiful newly installed dreadlocks locs, sitting in a professional salon, soft natural daylight, stylist's hands gently parting fresh locs, warm welcoming salon interior, high quality, 8k, detailed hair texture, realistic skin, cinematic lighting",
    "loc-retouching":
      "photorealistic close-up of a Black person's neat loc roots being retouched by a stylist in a salon, tidy uniform new growth, well-defined loc pattern, soft lighting, professional hair studio, detailed scalp and hair texture, high quality, 8k",
    "loc-maintenance":
      "photorealistic image of a Black client receiving loc maintenance in a salon, cleansing and conditioning treatment, fresh healthy locs, scalp care, gentle stylist hands, soft warm lighting, professional salon setting, high quality, 8k",
    "loc-styling":
      "photorealistic portrait of a Black woman with styled locs in an elegant updo with braids and curls, statement hairstyle for special occasion, professional salon, soft flattering lighting, detailed hair texture, high quality, 8k",
    "natural-hair-services":
      "photorealistic portrait of a Black woman with natural hair receiving wash and treatment in a salon, gentle cleansing, moisture-focused care, healthy natural hair, soft lighting, professional stylist, high quality, 8k",
    "loc-repair":
      "photorealistic close-up of damaged locs being assessed by a stylist in a salon, thinning and breaking locs, honest consultation, professional hair studio, soft lighting, detailed hair texture, high quality, 8k",
    "event-loc-styling":
      "photorealistic portrait of a Black woman with glamorous event loc styling for a wedding or graduation, elegant occasion hairstyle, professional salon, soft warm lighting, detailed hair, high quality, 8k",
    "natural-hair-treatment":
      "photorealistic image of a Black client receiving deep conditioning natural hair treatment in a salon, moisturized healthy hair, scalp care, soft lighting, professional setting, high quality, 8k",
  };
  return aiImage(prompts[slug] ?? prompts["loc-installation"], { width: 800, height: 1000, seed: hashString(slug) });
}

export function productImage(category: string): string {
  const c = category.toLowerCase();
  const prompts: Record<string, string> = {
    moisturizers:
      "photorealistic natural hair care moisturizer products, rich loc butter cream and hydrating lotion in elegant jars, displayed on a clean salon shelf, soft studio lighting, natural ingredients visible, high quality, 8k, product photography",
    "moulding gels":
      "photorealistic hair styling gels and edge control products, strong hold moulding gel and soft hold gel in sleek containers, displayed on a salon counter, soft studio lighting, product photography, high quality, 8k",
    "natural oils":
      "photorealistic natural hair and scalp oils, nourishing oil blends in amber glass bottles with droppers, displayed on a clean surface with natural ingredients like herbs and seeds, soft warm lighting, product photography, high quality, 8k",
    accessories:
      "photorealistic hair care accessories, wide-tooth comb, satin sleep bonnet, loc headband set, displayed on a clean salon shelf, soft natural lighting, lifestyle product photography, high quality, 8k",
  };
  const key = Object.keys(prompts).find((k) => c.includes(k));
  return aiImage(prompts[key ?? "moisturizers"], { width: 600, height: 600, seed: hashString(category) });
}

export function galleryImage(category: string): string {
  const c = category.toLowerCase();
  const prompts: Record<string, string> = {
    "loc styles":
      "photorealistic portrait of a Black person with beautiful styled dreadlocks locs, professional salon portrait, soft natural lighting, detailed hair texture, high quality, 8k",
    transformations:
      "photorealistic before and after loc transformation, Black client with transformed locs, professional salon, soft lighting, detailed hair texture, high quality, 8k",
    "natural hair":
      "photorealistic portrait of a Black person with healthy natural hair, professional salon portrait, soft natural lighting, detailed hair texture, high quality, 8k",
    salon:
      "photorealistic modern dreadlocks salon interior, welcoming reception area, natural wood, soft warm lighting, professional hair studio, high quality, 8k",
    videos:
      "photorealistic portrait of a Black person with locs being styled in a salon, stylist working on hair, soft lighting, professional setting, high quality, 8k",
  };
  const key = Object.keys(prompts).find((k) => c.includes(k));
  return aiImage(prompts[key ?? "loc styles"], { width: 800, height: 1000, seed: hashString(category) });
}

export function avatarImage(seed?: number): string {
  return aiImage(
    "photorealistic portrait of a beautiful Black person with natural hair or locs, professional headshot, soft studio lighting, high quality, 8k, detailed skin and hair texture",
    { width: 400, height: 400, seed: seed ?? 42 },
  );
}

export function salonImage(seed?: number): string {
  return aiImage(
    "photorealistic modern dreadlocks salon interior, welcoming reception, natural wood accents, soft warm lighting, professional hair studio, high quality, 8k",
    { width: 800, height: 600, seed: seed ?? 1 },
  );
}

export function locsImage(seed?: number): string {
  return aiImage(
    "photorealistic portrait of a Black person with beautiful dreadlocks locs, professional salon, soft natural lighting, high quality, 8k",
    { width: 800, height: 1000, seed: seed ?? 2 },
  );
}

export function braidsImage(seed?: number): string {
  return aiImage(
    "photorealistic portrait of a Black person with beautiful braided hairstyle, natural hair, salon, soft lighting, high quality, 8k",
    { width: 800, height: 1000, seed: seed ?? 3 },
  );
}

export function fallbackImage(seed?: number): string {
  return aiImage(
    "photorealistic natural hair care, dreadlocks, salon, beautiful, soft lighting, high quality, 8k",
    { width: 600, height: 600, seed: seed ?? 99 },
  );
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function placeholderForCategory(category: string, seed?: number): string {
  return productImage(category);
}

export function placeholderForGallery(category: string, seed?: number): string {
  return galleryImage(category);
}