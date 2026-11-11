import { Router } from "express";
import multer from "multer";
import { randomBytes } from "node:crypto";
import { mkdirSync, openSync, readSync, closeSync, unlinkSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { config } from "../config.js";
import { get, run, tx } from "../db.js";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { optionalAuth } from "../lib/auth.js";
import { email as emailSchema, phone } from "../lib/schemas.js";
import { nowIso, reference } from "../lib/util.js";

export const consultationsRouter = Router();
mkdirSync(config.uploadDir, { recursive: true });

const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (_req, file, cb) => cb(null, randomBytes(16).toString("hex") + (EXT[file.mimetype] ?? "")), // never trust client filenames
  }),
  limits: { files: config.upload.maxFiles, fileSize: config.upload.maxBytes },
  fileFilter: (_req, file, cb) => (EXT[file.mimetype] ? cb(null, true) : cb(new HttpError(400, `${file.originalname}: only JPG, PNG or WebP images are allowed`))),
});

/** The declared MIME type is client-controlled, so confirm the file's magic bytes. */
function sniff(file: string): string | null {
  const buf = Buffer.alloc(12);
  const fd = openSync(file, "r");
  try { readSync(fd, buf, 0, 12, 0); } finally { closeSync(fd); }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

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
  const discard = () => files.forEach((f) => { try { unlinkSync(f.path); } catch { /* already gone */ } });
  try {
    const v = schema.parse(req.body);
    for (const f of files) if (sniff(f.path) !== f.mimetype) throw new HttpError(400, `${f.originalname}: file contents do not match an allowed image type`);
    const ref = reference("CON");
    const r = await run(`INSERT INTO consultations (reference,user_id,full_name,phone,email,hair_condition,hair_length,loc_size,install_type,info,marketing_consent,created_at)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`, ref, req.user?.id ?? null, v.fullName, v.phone, v.email, v.condition, v.length, v.locSize, v.installType, v.info, v.marketingConsent ? 1 : 0, nowIso());
    const consultationId = Number(r.rows[0].id);
    for (const f of files) await run("INSERT INTO consultation_photos (consultation_id,filename,original_name,mime,size) VALUES ($1,$2,$3,$4,$5)", consultationId, f.filename, path.basename(f.originalname).slice(0, 200), f.mimetype, f.size);
    res.status(201).json({ consultation: { reference: ref, status: "new", photos: files.length }, message: "Thanks! We'll review your request and contact you soon." });
  } catch (e) {
    discard();
    throw e;
  }
}));

consultationsRouter.get("/consultation-info", (_req, res) =>
  res.json({ maxFiles: config.upload.maxFiles, maxBytes: config.upload.maxBytes, accepted: Object.keys(EXT) }));
export const consultationExists = (id: number) => !!get("SELECT 1 FROM consultations WHERE id=?", id);
