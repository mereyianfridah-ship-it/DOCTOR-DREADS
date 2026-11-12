import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { all, get, run, tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { requireAdmin } from "../lib/auth.js";
import { destroyImage, isCloudinaryConfigured, uploadImage, privateImageUrl } from "../lib/cloudinary.js";
import { nowIso, reference } from "../lib/util.js";

export const uploadsRouter = Router();
uploadsRouter.use(requireAdmin);

if (!isCloudinaryConfigured) {
  console.warn("[warn] CLOUDINARY_URL is not set: image uploads will return 503");
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

function sniffBuffer(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
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

uploadsRouter.post(
  "/uploads/products/:slug",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = req.file as Express.Multer.File | undefined;
    if (!file) throw new HttpError(400, "A photo file is required");
    const actual = sniffBuffer(file.buffer);
    if (!actual || actual !== file.mimetype) throw new HttpError(400, `${file.originalname}: contents do not match a JPG/PNG/WebP image`);
    const product = (await get<any>("SELECT * FROM products WHERE slug=$1", req.params.slug));
    if (!product) throw notFound("Product");
    const { publicId, secureUrl, mime, bytes, width, height } = await uploadImage(file.buffer, {
      folder: "drdread/products",
      access: "public",
    });
    const images: string[] = JSON.parse(product.images ?? "[]");
    images.push(secureUrl);
    const assetId = reference("MA");
    await tx(async (t$) => {
      await t$.run("UPDATE products SET images=$1 WHERE slug=$2", JSON.stringify(images), req.params.slug);
      await t$.run(
        "INSERT INTO media_assets (id,kind,public_id,secure_url,mime,bytes,width,height,folder,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
        assetId, "product", publicId, secureUrl, mime, bytes, width ?? null, height ?? null, "drdread/products", nowIso()
      );
    });
    res.status(201).json({ product: { slug: product.slug, images }, assetId, publicId, secureUrl });
  })
);

uploadsRouter.delete(
  "/uploads/products/:slug",
  asyncHandler(async (req, res) => {
    const body = z.object({ imageUrl: z.string().url() }).parse(req.body);
    const product = (await get<any>("SELECT * FROM products WHERE slug=$1", req.params.slug));
    if (!product) throw notFound("Product");
    const images: string[] = JSON.parse(product.images ?? "[]");
    if (!images.includes(body.imageUrl)) throw notFound("Image");
    const next = images.filter((u) => u !== body.imageUrl);
    await tx(async (t$) => {
      await t$.run("UPDATE products SET images=$1 WHERE slug=$2", JSON.stringify(next), req.params.slug);
      const asset = (await t$.get<any>("SELECT * FROM media_assets WHERE kind='product' AND secure_url=$1", body.imageUrl));
      if (asset) {
        await t$.run("DELETE FROM media_assets WHERE id=$1", asset.id);
        await destroyImage(asset.public_id, { access: "public" });
      }
    });
    res.json({ ok: true, images: next });
  })
);

uploadsRouter.post(
  "/uploads/consultations/:reference/photos",
  upload.array("photos", config.upload.maxFiles),
  asyncHandler(async (req, res) => {
    const files = (req.files ?? []) as Express.Multer.File[];
    if (files.length === 0) throw new HttpError(400, "At least one photo is required");
    for (const f of files) {
      const actual = sniffBuffer(f.buffer);
      if (!actual || actual !== f.mimetype) throw new HttpError(400, `${f.originalname}: contents do not match a JPG/PNG/WebP image`);
    }
    const consultation = (await get<any>("SELECT id FROM consultations WHERE reference=$1", req.params.reference));
    if (!consultation) throw notFound("Consultation");
    const uploaded = await Promise.all(
      files.map((f) => uploadImage(f.buffer, { folder: "drdread/consultations", access: "private" }))
    );
    await tx(async (t$) => {
      for (const [i, f] of files.entries()) {
        const u = uploaded[i];
        if (!u) continue; // FIXED: guard for undefined
        await t$.run(
          "INSERT INTO consultation_photos (consultation_id,filename,original_name,mime,size,cloudinary_public_id) VALUES ($1,$2,$3,$4,$5,$6)",
          consultation.id, f.originalname, f.originalname.slice(0, 200), u.mime, f.size, u.publicId
        );
      }
    });
    
    // FIXED: added .filter() to remove undefined objects
    res.status(201).json({
      photos: uploaded.map((u, i) => {
        const f = files[i];
        if (!u || !f) return null;
        return { publicId: u.publicId, mime: f.mimetype, size: f.size };
      }).filter((x): x is { publicId: string; mime: string; size: number } => x !== null),
    });
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
      "SELECT cloudinary_public_id AS publicId, mime FROM consultation_photos WHERE id=$1",
      Number(req.params.id)
    ));
    if (!photo || !photo.publicId) throw notFound("Photo");
    const url = privateImageUrl(photo.publicId, { expiresInMinutes: 10 });
    const upstream = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!upstream.ok) throw new HttpError(502, "Could not load the photo");
    res.setHeader("Content-Type", photo.mime);
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