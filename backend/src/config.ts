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
  /** Customer self-service rescheduling: how many times, and how many hours before the appointment it must be done. */
  reschedule: { maxCount: Number(env.RESCHEDULE_MAX ?? 2), minHours: Number(env.RESCHEDULE_MIN_HOURS ?? 24) },
  /** Deposit refund tiers on cancellation: full refund with fullHours+ notice, partialPercent with partialHours+ notice, else none. */
  refund: {
    fullHours: Number(env.REFUND_FULL_HOURS ?? 48),
    partialHours: Number(env.REFUND_PARTIAL_HOURS ?? 24),
    partialPercent: Number(env.REFUND_PARTIAL_PERCENT ?? 50),
  },
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
  /** Public frontend URL used in emailed links. Defaults to the first CORS origin. */
  appUrl: (env.APP_URL ?? (env.CORS_ORIGINS ?? "http://localhost:5173").split(",")[0] ?? "").trim().replace(/\/+$/, ""),
  /** Transactional email via Resend (https://resend.com). Without these, emails are only logged in development. */
  mail: { resendApiKey: env.RESEND_API_KEY ?? "", from: env.MAIL_FROM ?? "" },
  /** Appointment reminder emails. They only go out when email is configured (RESEND_API_KEY + MAIL_FROM). */
  reminders: {
    enabled: env.REMINDERS_ENABLED !== "false",
    hoursBefore: Math.max(1, Number(env.REMINDER_HOURS_BEFORE ?? 24) || 24),
    intervalMinutes: Math.max(1, Number(env.REMINDER_INTERVAL_MINUTES ?? 10) || 10),
  },
  passwordResetMinutes: Number(env.PASSWORD_RESET_MINUTES ?? 60),
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
