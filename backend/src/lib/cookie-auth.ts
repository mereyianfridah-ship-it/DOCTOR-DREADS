import type { RequestHandler } from "express";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";
import { get } from "../db.js";
import { HttpError } from "./errors.js";

export interface AuthUser {
  id: number;
  email: string;
  role:
    | "customer"
    | "admin"
    | "stylist"
    | "order-manager"
    | "inventory-manager"
    | "manager"
    | "receptionist"
    | "owner"
    | "super-admin";
  fullName: string;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const COOKIE_NAME = "token";
const secretKey = new TextEncoder().encode(config.jwtSecret);

export async function signToken(u: { id: number }): Promise<string> {
  return await new SignJWT({ sub: String(u.id) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(config.jwtExpiresIn)
    .sign(secretKey);
}

export function setAuthCookie(res: import("express").Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "none",     // REQUIRED for cross-origin cookies (Render -> Vercel)
    secure: true,         // REQUIRED when sameSite is "none" (Render is HTTPS)
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: import("express").Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
  });
}

async function loadFromToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) return null;
    const row = await get<any>(
      "SELECT id, email, role, full_name FROM users WHERE id=$1",
      id,
    );
    if (!row) return null;
    return { id: row.id, email: row.email, role: row.role, fullName: row.full_name };
  } catch {
    return null;
  }
}

export async function authFromCookie(
  req: import("express").Request,
): Promise<AuthUser | null> {
  const cookieToken: string | undefined = req.cookies?.[COOKIE_NAME];
  if (cookieToken) return loadFromToken(cookieToken);
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return loadFromToken(header.slice(7));
  return null;
}

export const optionalAuth: RequestHandler = async (req, _res, next) => {
  try {
    req.user = (await authFromCookie(req)) ?? undefined;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const user = await authFromCookie(req);
    if (!user) return next(new HttpError(401, "Please sign in"));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const user = await authFromCookie(req);
    if (!user) return next(new HttpError(401, "Please sign in"));
    if (user.role !== "admin") return next(new HttpError(403, "Admin access required"));
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};