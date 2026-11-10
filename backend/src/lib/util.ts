import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function reference(prefix: string): string {
  const b = randomBytes(6);
  let s = "";
  for (const x of b) s += ALPHABET[x % ALPHABET.length];
  return `${prefix}-${s}`;
}

/** Normalise Kenyan numbers to 2547XXXXXXXX / 2541XXXXXXXX; returns null if not a Kenyan mobile number. */
export function toMsisdn(raw: string): string | null {
  const d = raw.replace(/[\s-]/g, "").replace(/^\+/, "");
  if (/^0[17]\d{8}$/.test(d)) return "254" + d.slice(1);
  if (/^254[17]\d{8}$/.test(d)) return d;
  if (/^[17]\d{8}$/.test(d)) return "254" + d;
  return null;
}

/** Today's calendar date (YYYY-MM-DD) in East Africa Time (UTC+3, no DST). */
export function todayEAT(now = new Date()): string {
  return new Date(now.getTime() + 3 * 3600_000).toISOString().slice(0, 10);
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function isValidISODate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + "T00:00:00Z").toISOString().slice(0, 10) === s;
}
export const dayOfWeek = (iso: string) => new Date(iso + "T00:00:00Z").getUTCDay();
export const nowIso = () => new Date().toISOString();
export const plusMinutesIso = (m: number) => new Date(Date.now() + m * 60_000).toISOString();
