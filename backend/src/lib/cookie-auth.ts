import { sign, jwtVerify } from "jsonwebtoken";
import { config } from "./config.js";

const COOKIE_NAME = "drdread_auth";
const COOKIE_OPTIONS: { maxAge: number; httpOnly: true; secure: boolean; sameSite: "strict" | "lax" | "none" } = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.isProd ? "lax" : "strict",
};

/** Set an HttpOnly secure cookie with a JWT session token. */
export function setAuthCookie(res: any, user: { id: number }) {
  const token = sign({ sub: String(user.id) }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jsonwebtoken.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
}

/** Clear the auth cookie (logout). */
export function clearAuthCookie(res: any) {
  res.cookie(COOKIE_NAME, "", {
    maxAge: 0,
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? "lax" : "strict",
  });
}

/** Extract and verify the user from the auth cookie. */
export async function authFromCookie(req: { cookies: any; }) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return null;
    const payload = jwtVerify(token, config.jwtSecret, { algorithms: ["HS256"] }) as { sub: string };
    const user = await get<any>("SELECT id, email, role, full_name FROM users WHERE id=$1", Number(payload.sub));
    return user ? { id: user.id, email: user.email, role: user.role, fullName: user.full_name } : null;
  } catch {
    return null;
  }
}