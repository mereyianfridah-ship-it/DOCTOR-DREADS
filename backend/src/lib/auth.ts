import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { get } from "../db.js";
import { HttpError } from "./errors.js";

export interface AuthUser { id: number; email: string; role: "customer" | "admin" | "stylist" | "order-manager"; fullName: string }
declare module "express-serve-static-core" { interface Request { user?: AuthUser } }

export const signToken = (u: { id: number }) =>
  jwt.sign({ sub: String(u.id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"], algorithm: "HS256" });

async function load(header: string | undefined): Promise<AuthUser | null> {
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const p = jwt.verify(header.slice(7), config.jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    const u = await get<any>("SELECT id, email, role, full_name FROM users WHERE id=$1", Number(p.sub));
    return u ? { id: u.id, email: u.email, role: u.role, fullName: u.full_name } : null;
  } catch {
    return null;
  }
}

/** Attaches req.user when a valid token is present; never rejects (guest checkout/booking allowed). */
export const optionalAuth: RequestHandler = async (req, _res, next) => { req.user = await load(req.headers.authorization) ?? undefined; next(); };

export const requireAuth: RequestHandler = async (req, _res, next) => {
  req.user = await load(req.headers.authorization) ?? undefined;
  if (!req.user) return next(new HttpError(401, "Please sign in"));
  next();
};
export const requireAdmin: RequestHandler = (req, res, next) =>
  requireAuth(req, res, (err) => (err ? next(err) : req.user!.role === "admin" ? next() : next(new HttpError(403, "Admin access required"))));
