import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config.js";
import { get, run, tx } from "../db.js";
import { asyncHandler, HttpError } from "../lib/errors.js";
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  authFromCookie,
} from "../lib/cookie-auth.js";
import { email, fullName, password, phone } from "../lib/schemas.js";
import { nowIso, plusMinutesIso } from "../lib/util.js";
import { sendMail } from "../lib/mailer.js";

export const authRouter = Router();

const limiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: config.isTest ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, try again later" },
});

const publicUser = (u: any) => ({
  id: u.id,
  fullName: u.full_name,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

// Valid bcrypt hash used to equalise timing when the email is unknown.
const DUMMY_HASH = bcrypt.hashSync("dummy-password", config.bcryptCost);

authRouter.post(
  "/register",
  limiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({
        fullName,
        email,
        phone,
        password,
        terms: z.literal(true, {
          message: "You must accept the terms to continue",
        }),
      })
      .parse(req.body);

    if (await get("SELECT 1 FROM users WHERE email=$1", body.email)) {
      throw new HttpError(409, "An account with this email already exists", {
        email: "Email already registered",
      });
    }

    const hash = await bcrypt.hash(body.password, config.bcryptCost);
    const r = await run(
      "INSERT INTO users (full_name,email,phone,password_hash,role,created_at) VALUES ($1,$2,$3,$4,'customer',$5) RETURNING id",
      body.fullName,
      body.email,
      body.phone,
      hash,
      nowIso(),
    );
    const user = await get<any>(
      "SELECT * FROM users WHERE id=$1",
      Number(r.rows[0].id),
    );

    setAuthCookie(res, await signToken({ id: user.id }));
    res.status(201).json({ user: publicUser(user) });
  }),
);

authRouter.post(
  "/login",
  limiter,
  asyncHandler(async (req, res) => {
    const body = z
      .object({ email, password: z.string().min(1).max(200) })
      .parse(req.body);

    const user = await get<any>(
      "SELECT * FROM users WHERE email=$1",
      body.email,
    );
    const ok = await bcrypt.compare(
      body.password,
      user?.password_hash ?? DUMMY_HASH,
    );
    if (!user || !ok) throw new HttpError(401, "Incorrect email or password");

    setAuthCookie(res, await signToken({ id: user.id }));
    res.json({ user: publicUser(user) });
  }),
);

authRouter.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const authUser = await authFromCookie(req);
    if (!authUser) throw new HttpError(401, "Please sign in");
    const user = await get<any>(
      "SELECT * FROM users WHERE id=$1",
      authUser.id,
    );
    if (!user) throw new HttpError(401, "Please sign in");
    res.json({ user: publicUser(user) });
  }),
);

authRouter.patch(
  "/me",
  asyncHandler(async (req, res) => {
    const authUser = await authFromCookie(req);
    if (!authUser) throw new HttpError(401, "Please sign in");

    const body = z
      .object({ fullName: fullName.optional(), phone: phone.optional() })
      .parse(req.body);

    await run(
      "UPDATE users SET full_name=COALESCE($1,full_name), phone=COALESCE($2,phone) WHERE id=$3",
      body.fullName ?? null,
      body.phone ?? null,
      authUser.id,
    );

    const user = await get<any>(
      "SELECT * FROM users WHERE id=$1",
      authUser.id,
    );
    res.json({ user: publicUser(user) });
  }),
);

authRouter.post(
  "/change-password",
  limiter,
  asyncHandler(async (req, res) => {
    const authUser = await authFromCookie(req);
    if (!authUser) throw new HttpError(401, "Please sign in");

    const body = z
      .object({
        currentPassword: z.string().min(1),
        newPassword: password,
      })
      .parse(req.body);

    const u = (await get<any>(
      "SELECT * FROM users WHERE id=$1",
      authUser.id,
    ))!;
    if (!(await bcrypt.compare(body.currentPassword, u.password_hash))) {
      throw new HttpError(400, "Current password is incorrect", {
        currentPassword: "Incorrect password",
      });
    }

    await run(
      "UPDATE users SET password_hash=$1 WHERE id=$2",
      await bcrypt.hash(body.newPassword, config.bcryptCost),
      u.id,
    );
    res.json({ ok: true });
  }),
);

/* ---------------- password reset ---------------- */

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");
const GENERIC_FORGOT = "If an account exists for that email, we've sent a link to reset the password. It expires soon and works once.";
/** Max reset emails per account per hour: stops someone using the form to spam a customer's inbox. */
const MAX_RESETS_PER_HOUR = 3;

async function issueResetLink(emailAddr: string): Promise<void> {
  const user = await get<any>("SELECT id, full_name, email FROM users WHERE email=$1", emailAddr);
  if (!user) return;
  const recent = await get<{ n: string }>("SELECT COUNT(*) AS n FROM password_reset_tokens WHERE user_id=$1 AND created_at > $2", user.id, new Date(Date.now() - 3600_000).toISOString());
  if (Number(recent?.n ?? 0) >= MAX_RESETS_PER_HOUR) return;
  const token = randomBytes(32).toString("hex");
  await tx(async (t$) => {
    await t$.run("UPDATE password_reset_tokens SET used_at=$1 WHERE user_id=$2 AND used_at IS NULL", nowIso(), user.id); // only the newest link works
    await t$.run("INSERT INTO password_reset_tokens (user_id,token_hash,expires_at,created_at) VALUES ($1,$2,$3,$4)", user.id, sha256(token), plusMinutesIso(config.passwordResetMinutes), nowIso());
  });
  const link = `${config.appUrl}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: "Reset your Dr Dread Kenya password",
    text: `Hi ${String(user.full_name).split(" ")[0]},\n\nUse this link to choose a new password. It works once and expires in ${config.passwordResetMinutes} minutes:\n\n${link}\n\nIf you didn't ask for this, you can ignore this email; your password hasn't changed.`,
  });
}

authRouter.post("/forgot-password", limiter, asyncHandler(async (req, res) => {
  const { email: addr } = z.object({ email }).parse(req.body);
  // The answer is identical whether or not the account exists, and the work runs after responding,
  // so neither the message nor the response time reveals which emails are registered.
  const job = issueResetLink(addr).catch((e) => console.error("[forgot-password]", e instanceof Error ? e.message : e));
  if (config.isTest) await job;
  res.json({ ok: true, message: GENERIC_FORGOT });
}));

authRouter.post("/reset-password", limiter, asyncHandler(async (req, res) => {
  const body = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, "This reset link is invalid or has expired"), password }).parse(req.body);
  const invalid = () => new HttpError(400, "This reset link is invalid or has expired. Please request a new one.");
  const hash = await bcrypt.hash(body.password, config.bcryptCost);
  await tx(async (t$) => {
    // Claim the token atomically: a concurrent second use finds used_at already set.
    const claimed = await t$.get<{ user_id: number }>("UPDATE password_reset_tokens SET used_at=$1 WHERE token_hash=$2 AND used_at IS NULL AND expires_at > $1 RETURNING user_id", nowIso(), sha256(body.token));
    if (!claimed) throw invalid();
    await t$.run("UPDATE users SET password_hash=$1, password_changed_at=$2 WHERE id=$3", hash, nowIso(), claimed.user_id);
    await t$.run("UPDATE password_reset_tokens SET used_at=$1 WHERE user_id=$2 AND used_at IS NULL", nowIso(), claimed.user_id);
  });
  res.json({ ok: true });
}));
