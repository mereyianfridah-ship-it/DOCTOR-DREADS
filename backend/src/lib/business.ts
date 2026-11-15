import { toMsisdn } from "./util.js";

/** What the owner types in Admin > Settings. Empty string = "not set" (hidden on the site). */
export interface BusinessSettings {
  location: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

export const EMPTY_BUSINESS: BusinessSettings = {
  location: "", phone: "", whatsapp: "", email: "", hours: "", instagram: "", facebook: "", tiktok: "",
};

const SOCIAL_HOSTS: Record<"instagram" | "facebook" | "tiktok", string[]> = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  tiktok: ["tiktok.com"],
};

export class BusinessValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Please check the highlighted fields");
  }
}

/** "+254 712 345 678" for Kenyan mobiles; other international numbers keep their digits. null = invalid. */
export function normalizePhone(raw: string): { e164: string; display: string } | null {
  const msisdn = toMsisdn(raw);
  if (msisdn) {
    const n = msisdn.slice(3);
    return { e164: `+${msisdn}`, display: `+254 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}` };
  }
  const d = raw.replace(/[\s-]/g, "");
  if (/^\+\d{8,15}$/.test(d)) return { e164: d, display: d };
  return null;
}

function normalizeSocial(id: keyof typeof SOCIAL_HOSTS, raw: string): string | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== "https:") return null; // blocks javascript:, http:, data: ...
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
  if (!SOCIAL_HOSTS[id].some((h) => host === h || host.endsWith(`.${h}`))) return null;
  return u.toString();
}

/** Validate and canonicalise owner input. Throws BusinessValidationError listing every bad field. */
export function parseBusiness(input: unknown): BusinessSettings {
  const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const str = (k: keyof BusinessSettings) => (typeof src[k] === "string" ? (src[k] as string).trim() : "");
  const errors: Record<string, string> = {};
  const out: BusinessSettings = { ...EMPTY_BUSINESS };

  out.location = str("location");
  if (out.location.length > 120) errors.location = "Keep this under 120 characters";
  out.hours = str("hours");
  if (out.hours.length > 200) errors.hours = "Keep this under 200 characters";

  for (const k of ["phone", "whatsapp"] as const) {
    const v = str(k);
    if (!v) continue;
    const p = normalizePhone(v);
    if (!p) errors[k] = "Enter a Kenyan number like 0712 345 678, or an international one starting with +";
    else out[k] = p.e164;
  }

  const email = str("email");
  if (email) {
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address";
    else out.email = email;
  }

  for (const k of ["instagram", "facebook", "tiktok"] as const) {
    const v = str(k);
    if (!v) continue;
    const url = normalizeSocial(k, v);
    if (!url) errors[k] = `Paste the full https:// link to your ${k[0]!.toUpperCase() + k.slice(1)} page`;
    else out[k] = url;
  }

  if (Object.keys(errors).length) throw new BusinessValidationError(errors);
  return out;
}

/** Shape the public website consumes (same as the frontend's siteConfig.contact / social). */
export function publicBusiness(b: BusinessSettings) {
  const phone = b.phone ? normalizePhone(b.phone) : null;
  const wa = b.whatsapp ? normalizePhone(b.whatsapp) : null;
  return {
    location: b.location,
    contact: {
      phoneDisplay: phone?.display ?? "",
      phoneHref: phone ? `tel:${phone.e164}` : null,
      whatsappDisplay: wa?.display ?? "",
      whatsappHref: wa ? `https://wa.me/${wa.e164.slice(1)}` : null,
      emailDisplay: b.email,
      emailHref: b.email ? `mailto:${b.email}` : null,
      hours: b.hours,
    },
    social: [
      { id: "instagram", label: "Instagram", href: b.instagram || null },
      { id: "facebook", label: "Facebook", href: b.facebook || null },
      { id: "tiktok", label: "TikTok", href: b.tiktok || null },
    ],
  };
}
