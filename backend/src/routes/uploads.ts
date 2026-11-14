import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { get, run, tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { requireAdmin } from "../lib/auth.js";
import { destroyImage, isCloudinaryConfigured, uploadImage, privateImageUrl } from "../lib/cloudinary.js";
import { nowIso, reference, sniffBuffer } from "../lib/util.js";
import { isSiteImageSlot } from "../lib/siteImages.js";

export const uploadsRouter = Router();
// Scoped to /uploads so this router never intercepts public routes or the /api 404 handler.
uploadsRouter.use("/uploads", requireAdmin);

if (!isCloudinaryConfigured) {
  console.warn("[warn] CLOUDINARY_URL is not set: image uploads will return 503");
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

// Helper to safely parse the images text column
function safeParseImages(imagesData: any): string[] {
  if (!imagesData) return [];
  if (Array.isArray(imagesData)) return imagesData;
  try {
    const parsed = JSON.parse(imagesData);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: config.upload.maxFiles, fileSize: config.upload.maxBytes },
  fileFilter: (_req, file, cb) =>
    ALLOWED_MIME.includes(file.mimetype) ? cb(null, true) : cb(new HttpError(400, `${file.originalname}: only JPG, PNG or WebP images are allowed`)),
});

uploadsRouter.post(
  "/uploads/gallery",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) throw new HttpError(400, "A photo file is required");
    const actual = sniffBuffer(file.buffer);
    if (!actual || actual !== file.mimetype) throw new HttpError(400, `${file.originalname}: contents do not match a JPG/PNG/WebP image`);
    const body = z.object({ title: z.string().min(1), category: z.string().min(1) }).parse(req.body);
    const { publicId, secureUrl, mime, bytes, width, height } = await uploadImage(file.buffer, {
      folder: "drdread/gallery",
      access: "public",
    });
    const id = reference("GA");
    await tx(async (t$) => {
      await t$.run(
        "INSERT INTO gallery (id,title,category,image,cloudinary_public_id,after_image,is_video,sort) VALUES ($1,$2,$3,$4,$5,NULL,0,$6)",
        id, body.title, body.category, secureUrl, publicId, Date.now()
      );
      await t$.run(
        "INSERT INTO media_assets (id,kind,public_id,secure_url,mime,bytes,width,height,folder,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        id, "gallery", publicId, secureUrl, mime, bytes, width ?? null, height ?? null, "drdread/gallery", nowIso()
      );
    });
    res.status(201).json({ id, title: body.title, category: body.category, image: secureUrl, isVideo: false });
  })
);

const MAX_PRODUCT_IMAGES = 5;
const isPlaceholder = (u: string) => u.startsWith("/images/");

uploadsRouter.post(
  "/uploads/products/:slug",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) throw new HttpError(400, "A photo file is required");
    const actual = sniffBuffer(file.buffer);
    if (!actual || actual !== file.mimetype) throw new HttpError(400, `${file.originalname}: contents do not match a JPG/PNG/WebP image`);

    const product = await get<any>("SELECT * FROM products WHERE slug=$1", req.params.slug);
    if (!product) throw notFound("Product");

    const existing = safeParseImages(product.images);
    // Bundled sample SVGs are not real photos: they do not count toward the limit and are replaced.
    const real = existing.filter((u) => !isPlaceholder(u));
    if (real.length >= MAX_PRODUCT_IMAGES) throw new HttpError(400, `A product can have at most ${MAX_PRODUCT_IMAGES} photos`);

    const { publicId, secureUrl, mime, bytes, width, height } = await uploadImage(file.buffer, {
      folder: "drdread/products",
      access: "public",
    });

    const images = [...real, secureUrl];
    const assetId = reference("MA");
    try {
      await tx(async (t$) => {
        await t$.run("UPDATE products SET images=$1, updated_at=NOW() WHERE slug=$2", JSON.stringify(images), req.params.slug);
        await t$.run(
          "INSERT INTO media_assets (id,kind,public_id,secure_url,mime,bytes,width,height,folder,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          assetId, "product", publicId, secureUrl, mime, bytes, width ?? null, height ?? null, "drdread/products", nowIso()
        );
      });
    } catch (e) {
      // Do not leave an orphaned file in Cloudinary if the database write failed.
      await destroyImage(publicId, { access: "public" }).catch((err) => console.error("Cloudinary cleanup failed", err));
      throw e;
    }
    res.status(201).json({ url: secureUrl, secureUrl, assetId, publicId, images, product: { slug: product.slug, images } });
  })
);

/** Reorder a product's photos. The first image is the primary one shown on cards. */
uploadsRouter.put(
  "/uploads/products/:slug/order",
  asyncHandler(async (req, res) => {
    const body = z.object({ images: z.array(z.string().min(1)).max(MAX_PRODUCT_IMAGES) }).parse(req.body);
    const product = await get<any>("SELECT images FROM products WHERE slug=$1", req.params.slug);
    if (!product) throw notFound("Product");
    const current = safeParseImages(product.images);
    const same = body.images.length === current.length && [...body.images].sort().join("|") === [...current].sort().join("|");
    if (!same) throw new HttpError(400, "The new order must contain exactly the product's current images");
    await run("UPDATE products SET images=$1, updated_at=NOW() WHERE slug=$2", JSON.stringify(body.images), req.params.slug);
    res.json({ ok: true, images: body.images });
  })
);

uploadsRouter.delete(
  "/uploads/products/:slug",
  asyncHandler(async (req, res) => {
    const body = z.object({ imageUrl: z.string().min(1) }).parse(req.body);
    const product = await get<any>("SELECT * FROM products WHERE slug=$1", req.params.slug);
    if (!product) throw notFound("Product");

    const images = safeParseImages(product.images);
    if (!images.includes(body.imageUrl)) throw notFound("Image");
    const next = images.filter((u) => u !== body.imageUrl);
    let publicId: string | null = null;
    await tx(async (t$) => {
      await t$.run("UPDATE products SET images=$1, updated_at=NOW() WHERE slug=$2", JSON.stringify(next), req.params.slug);
      const asset = await t$.get<any>("SELECT * FROM media_assets WHERE kind='product' AND secure_url=$1", body.imageUrl);
      if (asset) {
        await t$.run("DELETE FROM media_assets WHERE id=$1", asset.id);
        publicId = asset.public_id;
      }
    });
    // Remote cleanup happens after the DB commit; a Cloudinary hiccup must not undo the user's delete.
    if (publicId) await destroyImage(publicId, { access: "public" }).catch((err) => console.error("Cloudinary delete failed", err));
    res.json({ ok: true, images: next });
  })
);

/** Throws unless the uploaded file's real contents match its declared JPG/PNG/WebP type. */
function requireImage(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file) throw new HttpError(400, "A photo file is required");
  const actual = sniffBuffer(file.buffer);
  if (!actual || actual !== file.mimetype) throw new HttpError(400, `${file.originalname}: contents do not match a JPG/PNG/WebP image`);
  return file;
}

/**
 * Replace the image in a site slot (hero, welcome photos, about, call-to-action background).
 * The new file is stored first; the previous upload is deleted from Cloudinary only after the database commit.
 */
uploadsRouter.put(
  "/uploads/site-images/:slot",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const slot = String(req.params.slot);
    if (!isSiteImageSlot(slot)) throw notFound("Image slot");
    const file = requireImage(req.file);
    const { alt } = z.object({ alt: z.string().trim().max(160).default("") }).parse(req.body);

    const { publicId, secureUrl, mime, bytes, width, height } = await uploadImage(file.buffer, { folder: "drdread/site", access: "public" });
    let previousPublicId: string | null = null;
    try {
      await tx(async (t$) => {
        const prev = await t$.get<any>("SELECT public_id FROM site_images WHERE slot=$1", slot);
        previousPublicId = prev?.public_id ?? null;
        await t$.run(
          "INSERT INTO site_images (slot,url,public_id,alt,updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slot) DO UPDATE SET url=EXCLUDED.url, public_id=EXCLUDED.public_id, alt=EXCLUDED.alt, updated_at=EXCLUDED.updated_at",
          slot, secureUrl, publicId, alt, nowIso(),
        );
        await t$.run(
          "INSERT INTO media_assets (id,kind,public_id,secure_url,mime,bytes,width,height,folder,created_at) VALUES ($1,'site',$2,$3,$4,$5,$6,$7,$8,$9)",
          reference("MA"), publicId, secureUrl, mime, bytes, width ?? null, height ?? null, "drdread/site", nowIso(),
        );
        if (previousPublicId) await t$.run("DELETE FROM media_assets WHERE public_id=$1", previousPublicId);
      });
    } catch (e) {
      await destroyImage(publicId, { access: "public" }).catch((err) => console.error("Cloudinary cleanup failed", err));
      throw e;
    }
    if (previousPublicId) await destroyImage(previousPublicId, { access: "public" }).catch((err) => console.error("Cloudinary delete failed", err));
    res.json({ slot, url: secureUrl, alt });
  })
);

/** Reset a slot to the bundled default image. */
uploadsRouter.delete(
  "/uploads/site-images/:slot",
  asyncHandler(async (req, res) => {
    const slot = String(req.params.slot);
    if (!isSiteImageSlot(slot)) throw notFound("Image slot");
    let publicId: string | null = null;
    await tx(async (t$) => {
      const row = await t$.get<any>("SELECT public_id FROM site_images WHERE slot=$1", slot);
      if (!row) return;
      publicId = row.public_id ?? null;
      await t$.run("DELETE FROM site_images WHERE slot=$1", slot);
      if (publicId) await t$.run("DELETE FROM media_assets WHERE public_id=$1", publicId);
    });
    if (publicId) await destroyImage(publicId, { access: "public" }).catch((err) => console.error("Cloudinary delete failed", err));
    res.json({ ok: true });
  })
);

/** Replace a service's photo. */
uploadsRouter.put(
  "/uploads/services/:slug",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = requireImage(req.file);
    const service = await get<any>("SELECT slug, image FROM services WHERE slug=$1", req.params.slug);
    if (!service) throw notFound("Service");

    const { publicId, secureUrl, mime, bytes, width, height } = await uploadImage(file.buffer, { folder: "drdread/services", access: "public" });
    let previousPublicId: string | null = null;
    try {
      await tx(async (t$) => {
        const prev = await t$.get<any>("SELECT public_id FROM media_assets WHERE kind='service' AND secure_url=$1", service.image);
        previousPublicId = prev?.public_id ?? null;
        await t$.run("UPDATE services SET image=$1 WHERE slug=$2", secureUrl, service.slug);
        await t$.run(
          "INSERT INTO media_assets (id,kind,public_id,secure_url,mime,bytes,width,height,folder,created_at) VALUES ($1,'service',$2,$3,$4,$5,$6,$7,$8,$9)",
          reference("MA"), publicId, secureUrl, mime, bytes, width ?? null, height ?? null, "drdread/services", nowIso(),
        );
        if (previousPublicId) await t$.run("DELETE FROM media_assets WHERE public_id=$1", previousPublicId);
      });
    } catch (e) {
      await destroyImage(publicId, { access: "public" }).catch((err) => console.error("Cloudinary cleanup failed", err));
      throw e;
    }
    if (previousPublicId) await destroyImage(previousPublicId, { access: "public" }).catch((err) => console.error("Cloudinary delete failed", err));
    res.json({ slug: service.slug, image: secureUrl });
  })
);

uploadsRouter.delete(
  "/uploads/gallery/:id",
  asyncHandler(async (req, res) => {
    const row = await get<any>("SELECT id, cloudinary_public_id FROM gallery WHERE id=$1", req.params.id);
    if (!row) throw notFound("Gallery item");
    await tx(async (t$) => {
      await t$.run("DELETE FROM gallery WHERE id=$1", row.id);
      await t$.run("DELETE FROM media_assets WHERE id=$1", row.id);
    });
    if (row.cloudinary_public_id) await destroyImage(row.cloudinary_public_id, { access: "public" }).catch((err) => console.error("Cloudinary delete failed", err));
    res.json({ ok: true });
  })
);

uploadsRouter.delete(
  "/uploads/consultations/photos/:id",
  asyncHandler(async (req, res) => {
    const photo = (await get<any>(
      "SELECT * FROM consultation_photos WHERE id=$1",
      Number(req.params.id)
    ));
    if (!photo) throw notFound("Photo");
    if (photo.cloudinary_public_id) await destroyImage(photo.cloudinary_public_id, { access: "private" });
    await run("DELETE FROM consultation_photos WHERE id=$1", Number(req.params.id));
    res.json({ ok: true });
  })
);

uploadsRouter.get(
  "/uploads/consultations/photos/:id/content",
  asyncHandler(async (req, res) => {
    const photo = (await get<any>(
      "SELECT cloudinary_public_id AS \"publicId\", mime FROM consultation_photos WHERE id=$1",
      Number(req.params.id)
    ));
    if (!photo || !photo.publicId) throw notFound("Photo");
    const url = privateImageUrl(photo.publicId, { expiresInMinutes: 10 });
    const upstream = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!upstream.ok) throw new HttpError(502, "Could not load the photo");
    res.setHeader("Content-Type", photo.mime === "image/jpg" ? "image/jpeg" : photo.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    const body = upstream.body;
    if (body === null) throw new HttpError(502, "Empty photo response");
    const chunks: Buffer[] = [];
    // @ts-ignore - undici ReadableStream supports async iteration on Node 22
    for await (const chunk of body as any) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
    res.end(Buffer.concat(chunks));
  })
);