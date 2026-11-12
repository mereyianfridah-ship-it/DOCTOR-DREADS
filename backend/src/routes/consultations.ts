import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { get, run, tx } from "../db.js";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { optionalAuth } from "../lib/auth.js";
import { email as emailSchema, phone } from "../lib/schemas.js";
import { sniffBuffer, nowIso, reference } from "../lib/util.js";
import { uploadImage } from "../lib/cloudinary.js";

export const consultationsRouter = Router();

const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.memoryStorage(), // never write consultation photos to local disk
  limits: { files: config.upload.maxFiles, fileSize: config.upload.maxBytes },
  fileFilter: (_req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, `${file.originalname}: only JPG, PNG or WebP images are allowed`))),
});

const schema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(120),
  phone,
  email: emailSchema.or(z.literal("")).default(""),
  condition: z.string().trim().min(1, "Select your hair condition").max(100),
  length: z.string().trim().min(1, "Select your hair length").max(100),
  locSize: z.string().trim().min(1, "Select a loc size").max(100),
  installType: z.string().trim().min(1, "Select an installation type").max(100),
  info: z.string().trim().max(1000, "Please keep this under 1000 characters").default(""),
  marketingConsent: z.union([z.boolean(), z.enum(["true", "false", "on"])]).default(false).transform((v) => v === true || v === "true" || v === "on"),
});

/** multipart/form-data: text fields as in the form + up to 5 files in the "photos" field. */
consultationsRouter.post("/consultations", optionalAuth, upload.array("photos", config.upload.maxFiles), asyncHandler(async (req, res) => {
  const files = (req.files ?? []) as Express.Multer.File[];
  try {
    const v = schema.parse(req.body);
    for (const f of files) {
      const actual = sniffBuffer(f.buffer);
      if (!actual || actual !== f.mimetype) throw new HttpError(400, `${f.originalname}: file contents do not match an allowed image type`);
    }
    const ref = reference("CON");
    const r = await run(`INSERT INTO consultations (reference,user_id,full_name,phone,email,hair_condition,hair_length,loc_size,install_type,info,marketing_consent,created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, ref, req.user?.id ?? null, v.fullName, v.phone, v.email, v.condition, v.length, v.locSize, v.installType, v.info, v.marketingConsent ? 1 : 0, nowIso());
    const consultationId = Number(r.rows[0].id);
    const safeName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
    if (files.length) {
      const uploaded = await Promise.all(files.map((f) => uploadImage(f.buffer, { folder: "drdread/consultations", access: "private" })));
      await tx(async (t$) => {
        for (const [i, f] of files.entries()) {
          const u = uploaded[i];
          await t$.run("INSERT INTO consultation_photos (consultation_id,filename,original_name,mime,size,cloudinary_public_id) VALUES ($1,$2,$3,$4,$5,$6)",
            consultationId, `photo-${i + 1}.${EXT[f.mimetype]}`, safeName(f.originalname), u.mime, f.size, u.publicId);
        }
      });
    }
    res.status(201).json({ consultation: { reference: ref, status: "new", photos: files.length }, message: "Thanks! We'll review your request and contact you soon." });
  } catch (e) {
    throw e;
  }
}));

consultationsRouter.get("/consultation-info", (_req, res) =>
  res.json({ maxFiles: config.upload.maxFiles, maxBytes: config.upload.maxBytes, accepted: Object.keys(EXT) }));
export const consultationExists = async (id: number): Promise<boolean> => {
  const row = await get<{ n: string }>("SELECT COUNT(*) AS n FROM consultations WHERE id=$1", id);
  return Number(row?.n ?? 0) > 0;
};
