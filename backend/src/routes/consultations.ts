import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { config } from "../config.js";
import { all, get, run, tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { optionalAuth } from "../lib/auth.js";
import { email as emailSchema, phone } from "../lib/schemas.js";
import { sniffBuffer, nowIso, reference } from "../lib/util.js";
import { uploadImage } from "../lib/cloudinary.js";

export const consultationsRouter = Router();

const EXT: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const upload = multer({
  storage: multer.memoryStorage(),
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
          if (!u) continue; // FIXED: guard against undefined
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

/** Compare two phone numbers by their last 9 digits so 0712 345 678, +254712345678 and 712345678 all match. */
export function samePhone(a: string, b: string): boolean {
  const da = a.replace(/\D/g, ""), db = b.replace(/\D/g, "");
  return da.length >= 9 && db.length >= 9 && da.slice(-9) === db.slice(-9);
}

/** A guest proves ownership with the email or phone number they gave on the request. */
export function contactMatches(c: { email: string; phone: string }, contact: unknown): boolean {
  if (typeof contact !== "string" || !contact.trim()) return false;
  const q = contact.trim();
  if (c.email && q.toLowerCase() === c.email.toLowerCase()) return true;
  return samePhone(c.phone, q);
}

export const consultationPublicView = (c: any, photoCount: number) => ({
  reference: c.reference,
  status: c.status,
  createdAt: c.created_at,
  condition: c.hair_condition,
  length: c.hair_length,
  locSize: c.loc_size,
  installType: c.install_type,
  info: c.info,
  photos: photoCount,
  quotation: c.quotation_amount == null ? null : {
    amount: c.quotation_amount, note: c.quotation_note, quotedAt: c.quoted_at,
    response: c.quotation_response ?? null, respondedAt: c.quotation_responded_at ?? null,
  },
});

/** Owner (signed in), admin, or a guest who supplies the contact given on the request. Same 404 for every failure. */
async function findOwnedConsultation(req: any, reference: string, contact: unknown) {
  const c = await get<any>("SELECT * FROM consultations WHERE reference=$1", reference.toUpperCase());
  const allowed = c && (req.user?.role === "admin" || (req.user && c.user_id === req.user.id) || contactMatches(c, contact));
  if (!allowed) throw notFound("Consultation");
  return c;
}

// Customer-facing status. Contact details are never returned; a wrong reference and a wrong
// contact both give the same 404 so references cannot be probed.
consultationsRouter.get("/consultations/:reference", optionalAuth, asyncHandler(async (req, res) => {
  const c = await findOwnedConsultation(req, String(req.params.reference), req.query.contact);
  const photos = await all<{ id: number }>("SELECT id FROM consultation_photos WHERE consultation_id=$1", c.id);
  res.json({ consultation: consultationPublicView(c, photos.length) });
}));

const responseSchema = z.object({
  response: z.enum(["accepted", "declined"], "Choose accept or decline"),
  contact: z.string().max(254).optional(),
});

// The customer's reply to a quotation. It records intent only: no booking is made and nothing is charged.
consultationsRouter.post("/consultations/:reference/quotation-response", optionalAuth, asyncHandler(async (req, res) => {
  const v = responseSchema.parse(req.body);
  const c = await findOwnedConsultation(req, String(req.params.reference), v.contact ?? req.query.contact);
  if (c.quotation_amount == null) throw new HttpError(409, "There is no quotation to respond to yet");
  if (c.status !== "quoted") throw new HttpError(409, "This request is no longer open for a response");
  // Conditional update: two concurrent replies cannot both succeed.
  const r = await run("UPDATE consultations SET quotation_response=$1, quotation_responded_at=$2 WHERE id=$3 AND status='quoted' AND quotation_amount IS NOT NULL AND quotation_response IS NULL", v.response, nowIso(), c.id);
  if (r.rowCount === 0) throw new HttpError(409, "You have already responded to this quotation");
  const fresh = await get<any>("SELECT * FROM consultations WHERE id=$1", c.id);
  const photos = await all<{ id: number }>("SELECT id FROM consultation_photos WHERE consultation_id=$1", c.id);
  res.json({ consultation: consultationPublicView(fresh, photos.length) });
}));

consultationsRouter.get("/consultation-info", (_req, res) =>
  res.json({ maxFiles: config.upload.maxFiles, maxBytes: config.upload.maxBytes, accepted: Object.keys(EXT) }));
export const consultationExists = async (id: number): Promise<boolean> => {
  const row = await get<{ n: string }>("SELECT COUNT(*) AS n FROM consultations WHERE id=$1", id);
  return Number(row?.n ?? 0) > 0;
};