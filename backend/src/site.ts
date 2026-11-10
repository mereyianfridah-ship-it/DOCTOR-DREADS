import { seedJson } from "./config.js";

/** Business rules shared with the frontend (src/config/site.ts). Edit seed/site.json or override via env later. */
export interface SiteSeed {
  booking: { openDays: number[]; slots: string[]; advanceDays: number; depositPercent: number; inPersonConsultationFee: number | null; onlineConsultationFree: boolean };
  checkout: { deliveryAreas: { id: string; label: string; fee: number }[]; collectionLabel?: string };
  stylists: { id: string; name: string; note: string }[];
}
export const site = seedJson<SiteSeed>("site");
/** Real (assignable) stylists: everything except the "auto" pseudo-entry. */
export const realStylists = site.stylists.filter((s) => s.id !== "auto");
