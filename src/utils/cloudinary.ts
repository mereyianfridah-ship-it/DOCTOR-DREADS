/**
 * Asks Cloudinary for a smaller, modern-format copy of an uploaded photo (auto format + quality,
 * never wider than `width`). A phone photo can be 5-10 MB; this keeps the hero fast.
 * Anything that isn't a plain Cloudinary upload URL (bundled SVGs, already-transformed URLs) is returned unchanged.
 */
export function optimizedUrl(url: string, width: number): string {
  const m = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(v\d+\/.+)$/.exec(url);
  if (!m) return url;
  return `${m[1]}f_auto,q_auto,c_limit,w_${Math.round(width)}/${m[2]}`;
}

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Client-side pre-check so the owner gets an instant message; the server re-checks everything. */
export function imageFileProblem(file: { type: string; size: number; name?: string }): string | null {
  if (!OK_TYPES.includes(file.type)) return "Please choose a JPG, PNG or WebP photo.";
  if (file.size > MAX_IMAGE_BYTES) return "That photo is larger than 10 MB. Please choose a smaller one.";
  if (file.size === 0) return "That file is empty.";
  return null;
}
