import { randomBytes } from "node:crypto";
import { openSync, readSync, closeSync } from "node:fs";

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

/** Convert "HH:MM" to minutes since midnight. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map((part) => Number(part));
  return h * 60 + m;
}

/** Add minutes to a "HH:MM" time (same day), wrapping past midnight. */
export function addMinutesToHhmm(hhmm: string, minutes: number): string {
  const base = new Date(`1970-01-01T${hhmm}:00Z`);
  base.setMinutes(base.getMinutes() + minutes);
  return base.toISOString().substring(11, 16);
}

/** True when half-open intervals [aStart, aEnd) and [bStart, bEnd) overlap. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Confirm the actual file contents match an allowed image MIME type (magic bytes). */
export function sniffBuffer(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "image/webp";
  return null;
}

/** Confirm the actual file contents of a file on disk match an allowed image MIME type (magic bytes). */
export function sniffImage(filePath: string): string | null {
  const buf = Buffer.alloc(12);
  const fd = openSync(filePath, "r");
  try { readSync(fd, buf, 0, 12, 0); } finally { closeSync(fd); }
  return sniffBuffer(buf);
}
