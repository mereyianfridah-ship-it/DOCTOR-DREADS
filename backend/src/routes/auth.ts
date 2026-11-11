import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config.js";
import { get, run } from "../db.js";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { requireAuth, signToken } from "../lib/auth.js";
import { email, fullName, password, phone } from "../lib/schemas.js";
import { nowIso } from "../lib/util.js";

export const authRouter = Router();
const limiter = rateLimit({ windowMs: 15 * 60_000, limit: config.isTest ? 1000 : 20, standardHeaders: true, legacyHeaders: false, message: { error: "Too many attempts, try again later" } });

const publicUser = (u: any) => ({ id: u.id, fullName: u.full_name, email: u.email, phone: u.phone, role: u.role });
// Valid bcrypt hash used to equalise timing when the email is unknown.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", config.bcryptCost);

authRouter.post("/register", limiter, asyncHandler(async (req, res) => {
  const body = z.object({ fullName, email, phone, password, terms: z.literal(true, { message: "You must accept the terms to continue" }) }).parse(req.body);
  if (await get("SELECT 1 FROM users WHERE email=$1", body.email)) throw new HttpError(409, "An account with this email already exists", { email: "Email already registered" });
  const hash = await bcrypt.hash(body.password, config.bcryptCost);
  const r = await run("INSERT INTO users (full_name,email,phone,password_hash,role,created_at) VALUES ($1,$2,$3,$4,'customer',$5) RETURNING id", body.fullName, body.email, body.phone, hash, nowIso());
  const user = await get<any>("SELECT * FROM users WHERE id=$1", Number(r.rows[0].id));
  res.status(201).json({ token: signToken(user), user: publicUser(user) });
}));

authRouter.post("/login", limiter, asyncHandler(async (req, res) => {
  const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body);
  const user = await get<any>("SELECT * FROM users WHERE email=$1", body.email);
  const ok = await bcrypt.compare(body.password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !ok) throw new HttpError(401, "Incorrect email or password");
  res.json({ token: signToken(user), user: publicUser(user) });
}));

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json({ user: publicUser(await get("SELECT * FROM users WHERE id=$1", req.user!.id)) });
});

authRouter.patch("/me", requireAuth, asyncHandler(async (req, res) => {
  const body = z.object({ fullName: fullName.optional(), phone: phone.optional() }).parse(req.body);
  await run("UPDATE users SET full_name=COALESCE($1,full_name), phone=COALESCE($2,phone) WHERE id=$3", body.fullName ?? null, body.phone ?? null, req.user!.id);
  res.json({ user: publicUser(await get("SELECT * FROM users WHERE id=$1", req.user!.id)) });
}));

authRouter.post("/change-password", requireAuth, limiter, asyncHandler(async (req, res) => {
  const body = z.object({ currentPassword: z.string().min(1), newPassword: password }).parse(req.body);
  const u = (await get<any>("SELECT * FROM users WHERE id=$1", req.user!.id))!;
  if (!(await bcrypt.compare(body.currentPassword, u.password_hash))) throw new HttpError(400, "Current password is incorrect", { currentPassword: "Incorrect password" });
  await run("UPDATE users SET password_hash=$1 WHERE id=$2", await bcrypt.hash(body.newPassword, config.bcryptCost), u.id);
  res.json({ ok: true });
}));
