import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config.js";
import { run } from "../db.js";
import { asyncHandler, HttpError } from "../lib/errors.js";
import { email, phone } from "../lib/schemas.js";
import { nowIso } from "../lib/util.js";

export const contactRouter = Router();
const limiter = rateLimit({ windowMs: 10 * 60_000, limit: config.isTest ? 1000 : 5, standardHeaders: true, legacyHeaders: false, message: { error: "Too many messages, please try again later" } });

contactRouter.post("/contact", limiter, asyncHandler(async (req, res) => {
  const b = z.object({
    name: z.string().trim().min(2, "Please enter your name").max(120), email,
    phone: phone.or(z.literal("")).default(""),
    subject: z.string().trim().min(3, "Please add a subject").max(200),
    message: z.string().trim().min(10, "Message must be at least 10 characters").max(5000),
    website: z.string().optional(), // honeypot: real users leave this empty
  }).parse(req.body);
  if (b.website) return res.status(201).json({ ok: true }); // pretend success to bots
  await run("INSERT INTO contact_messages (name,email,phone,subject,message,created_at) VALUES ($1,$2,$3,$4,$5,$6)", b.name, b.email, b.phone, b.subject, b.message, nowIso());
  res.status(201).json({ ok: true, message: "Thanks for getting in touch. We'll reply soon." });
}));
