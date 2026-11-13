import "dotenv/config";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, "..");

const env = process.env;
const isProd = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";

function jwtSecret(): string {
  if (env.JWT_SECRET && env.JWT_SECRET.length >= 32) return env.JWT_SECRET;
  if (isProd) throw new Error("JWT_SECRET (>= 32 chars) is required in production");
  return "dev-only-insecure-secret-change-me-0123456789";
}

export const config = {
  isProd,
  isTest,
  port: Number(env.PORT ?? 4000),
  corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:5173").split(",").map((s) => s.trim()).filter(Boolean),
  databaseUrl: env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/drdread",
  uploadDir: env.UPLOAD_DIR ?? path.join(ROOT, "uploads"),
  jwtSecret: jwtSecret(),
  jwtExpiresIn: env.JWT_EXPIRES_IN ?? "7d",
  bcryptCost: isTest ? 4 : 10,
  /** Minutes an unpaid order/booking holds stock or a slot before it expires. */
  holdMinutes: Number(env.HOLD_MINUTES ?? 10),
  upload: { maxFiles: 5, maxBytes: 10 * 1024 * 1024 },
  /** Cloudinary (secure backend uploads). CLOUDINARY_URL encodes cloud_name/api_key/api_secret. */
  cloudinaryUrl: env.CLOUDINARY_URL ?? "",
  payments: {
    /** "mock" completes payments instantly (no money moves). "daraja" uses the real M-Pesa API. */
    mode: (env.PAYMENTS_MODE ?? "disabled") as "mock" | "daraja" | "disabled",
    mpesa: {
      env: (env.MPESA_ENV ?? "sandbox") as "sandbox" | "production",
      consumerKey: env.MPESA_CONSUMER_KEY ?? "",
      consumerSecret: env.MPESA_CONSUMER_SECRET ?? "",
      shortcode: env.MPESA_SHORTCODE ?? "",
      passkey: env.MPESA_PASSKEY ?? "",
      /** Public base URL Safaricom can reach, e.g. https://api.example.com */
      callbackBaseUrl: env.MPESA_CALLBACK_BASE_URL ?? "",
      /** Secret path segment: Safaricom does not sign callbacks, so the URL itself is the secret. */
      callbackSecret: env.MPESA_CALLBACK_SECRET ?? "",
    },
  },
  /** "none" works across Vercel -> Render but is blocked by Safari/Firefox strict modes. Use "lax" with a same-site API (custom domain pair or Vercel /api rewrite). */
  cookieSameSite: (env.COOKIE_SAMESITE === "lax" || env.COOKIE_SAMESITE === "strict" ? env.COOKIE_SAMESITE : "none") as "none" | "lax" | "strict",
  adminEmail: env.ADMIN_EMAIL ?? "",
  adminPassword: env.ADMIN_PASSWORD ?? "",
};

if (config.payments.mode === "daraja") {
  const m = config.payments.mpesa;
  const missing = Object.entries({
    MPESA_CONSUMER_KEY: m.consumerKey, MPESA_CONSUMER_SECRET: m.consumerSecret, MPESA_SHORTCODE: m.shortcode,
    MPESA_PASSKEY: m.passkey, MPESA_CALLBACK_BASE_URL: m.callbackBaseUrl, MPESA_CALLBACK_SECRET: m.callbackSecret,
  }).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`PAYMENTS_MODE=daraja requires: ${missing.join(", ")}`);
}
if (isProd) {
  const missing = Object.entries({ DATABASE_URL: env.DATABASE_URL, CORS_ORIGINS: env.CORS_ORIGINS, CLOUDINARY_URL: env.CLOUDINARY_URL })
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) throw new Error(`Missing required production env vars: ${missing.join(", ")}`);
  if (env.CLOUDINARY_URL && !/^cloudinary:\/\/[^:\s]+:[^@\s]+@[^\s]+$/.test(env.CLOUDINARY_URL)) {
    throw new Error("CLOUDINARY_URL is malformed. Expected cloudinary://API_KEY:API_SECRET@CLOUD_NAME (no quotes or spaces)");
  }
}
if (isProd && config.payments.mode === "mock") {
  throw new Error("[error] PAYMENTS_MODE=mock is not allowed in production. Set PAYMENTS_MODE=daraja or PAYMENTS_MODE=disabled.");
}

export function seedJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, "seed", `${name}.json`), "utf8")) as T;
}
