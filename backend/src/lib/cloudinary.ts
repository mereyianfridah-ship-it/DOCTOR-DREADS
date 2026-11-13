import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from "cloudinary";
import { config } from "../config.js";
import { HttpError } from "./errors.js";

export { cloudinary };

if (config.cloudinaryUrl) {
  cloudinary.config({ url: config.cloudinaryUrl });
}

export const isCloudinaryConfigured = Boolean(config.cloudinaryUrl);

export interface ImageUploadResult {
  publicId: string;
  secureUrl: string;
  mime: string;
  bytes: number;
  width?: number;
  height?: number;
}

/**
 * Upload a buffer to Cloudinary from memory (never to local disk).
 * `access: "private"` stores an authenticated resource that can only be
 * delivered through a short-lived signed URL.
 */
export async function uploadImage(
  buffer: Buffer,
  opts: { folder: string; publicId?: string; access: "public" | "private" }
): Promise<ImageUploadResult> {
  if (!config.cloudinaryUrl) throw new HttpError(503, "Image uploads are not configured on this server");
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: opts.folder,
        public_id: opts.publicId,
        resource_type: "image",
        type: opts.access === "private" ? "authenticated" : "upload",
        timeout: 60_000,
      },
      (err: UploadApiErrorResponse | undefined, result?: UploadApiResponse) =>
        {
          if (!err) return resolve(result!);
          // Log the real reason (never the secret) so it shows up in the Render logs.
          console.error("[cloudinary] upload failed:", { message: err.message, http_code: (err as any).http_code, name: (err as any).name });
          const code = (err as any).http_code;
          const hint = code === 401 || code === 403 ? " (server credentials were rejected)" : "";
          reject(new HttpError(502, `Image storage service failed${hint}. Please try again.`));
        }
    );
    stream.end(buffer);
  });
  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    mime: result.format ? (result.format === "jpg" ? "image/jpeg" : `image/${result.format}`) : "application/octet-stream",
    bytes: result.bytes,
    width: result.width,
    height: result.height,
  };
}

/** Delete a Cloudinary resource (and its derived images). */
export async function destroyImage(publicId: string, opts: { access: "public" | "private" }): Promise<void> {
  if (!config.cloudinaryUrl) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    type: opts.access === "private" ? "authenticated" : "upload",
    invalidate: true,
  });
}

/**
 * Short-lived signed URL for a private (authenticated) Cloudinary image.
 * Never returns a permanent public URL for private assets.
 */
export function privateImageUrl(publicId: string, opts: { expiresInMinutes?: number }): string {
  const expiresAt = Math.floor(Date.now() / 1000) + (opts.expiresInMinutes ?? 10) * 60;
  return cloudinary.url(publicId, {
    type: "authenticated",
    sign_url: true,
    expires_at: expiresAt,
    secure: true,
  });
}
