import { all, get, run } from "../db.js";
import { nowIso } from "./util.js";
import { realStylists, site } from "../site.js";

const MANAGED_KEY = "stylists_managed";
export const RESERVED_STYLIST_IDS = ["auto", "same"];

export interface PublicStylist { id: string; name: string; note: string }

/** True once the owner has added a stylist; from then on the database, not seed/site.json, is the source. */
export async function stylistsManaged(): Promise<boolean> {
  return !!(await get("SELECT 1 FROM app_settings WHERE key=$1", MANAGED_KEY));
}

/** Stylists customers can currently be booked with (never includes the "auto" pseudo-entry). */
export async function activeStylists(): Promise<PublicStylist[]> {
  if (!(await stylistsManaged())) return realStylists;
  return all<PublicStylist>("SELECT id, name, note FROM stylists WHERE active=1 ORDER BY sort, created_at, id");
}

/** The "auto" pseudo-entry from the seed, shown first in the booking form. */
const autoEntry: PublicStylist = site.stylists.find((s) => s.id === "auto") ?? { id: "auto", name: "Assign automatically", note: "We'll match you with an available stylist" };

export async function stylistChoices(): Promise<PublicStylist[]> {
  return [autoEntry, ...(await activeStylists())];
}

export async function markStylistsManaged(runner: (sql: string, ...p: any[]) => Promise<unknown> = run): Promise<void> {
  await runner("INSERT INTO app_settings (key,value,updated_at) VALUES ($1,'1',$2) ON CONFLICT (key) DO NOTHING", MANAGED_KEY, nowIso());
}

export function slugifyName(name: string): string {
  const s = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return s || "stylist";
}
