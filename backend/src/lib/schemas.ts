import { z } from "zod";

/** Mirrors the frontend's phoneSchema (src/utils/validation.ts). */
export const phone = z.string().trim().min(1, "Phone number is required")
  .refine((v) => /^\+?[0-9\s-]{9,15}$/.test(v) && v.replace(/\D/g, "").length >= 9, "Enter a valid phone number");
export const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
export const fullName = z.string().trim().min(2, "Please enter your full name").max(120);
export const password = z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long");
