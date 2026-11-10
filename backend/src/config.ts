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
  dbPath: env.DB_PATH ?? (isTest ? ":memory:" : path.join(ROOT, "data", "drdread.db")),
  uploadDir: env.UPLOAD_DIR ?? path.join(ROOT, "uploads"),
  jwtSecret: jwtSecret(),
  jwtExpiresIn: env.JWT_EXPIRES_IN ?? "7d",
  bcryptCost: isTest ? 4 : 10,
  /** Minutes an unpaid order/booking holds stock or a slot before it expires. */
  holdMinutes: Number(env.HOLD_MINUTES ?? 30),
  upload: { maxFiles: 5, maxBytes: 5 * 1024 * 1024 },
  payments: {
    /** "mock" completes payments instantly (no money moves). "daraja" uses the real M-Pesa API. */
    mode: (env.PAYMENTS_MODE ?? "mock") as "mock" | "daraja",
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
if (isProd && config.payments.mode === "mock") {
  console.warn("[warn] PAYMENTS_MODE=mock in production: payments are NOT real.");
}

export function seedJson<T>(name: string): T {
  return JSON.parse(readFileSync(path.join(ROOT, "seed", `${name}.json`), "utf8")) as T;
}
