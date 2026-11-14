import { z } from "zod";

/** Accepts Kenyan numbers (07xx, 01xx, +2547xx) and general international formats. */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .refine((v) => /^\+?[0-9\s-]{9,15}$/.test(v) && v.replace(/\D/g, "").length >= 9, "Enter a valid phone number");

/** True when the value looks like an email address or a phone number (used for guest consultation lookup). */
export function looksLikeEmailOrPhone(value: string): boolean {
  const v = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;
  return /^\+?[0-9\s-]{9,15}$/.test(v) && v.replace(/\D/g, "").length >= 9;
}
