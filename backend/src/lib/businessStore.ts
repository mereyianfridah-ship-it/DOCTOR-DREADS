import { get } from "../db.js";
import { EMPTY_BUSINESS, type BusinessSettings } from "./business.js";

/** The owner's saved business details (all empty until Admin > Settings is filled in). */
export async function loadBusiness(): Promise<BusinessSettings> {
  const row = await get<{ value: string }>("SELECT value FROM app_settings WHERE key='business'");
  if (!row) return { ...EMPTY_BUSINESS };
  try { return { ...EMPTY_BUSINESS, ...JSON.parse(row.value) }; } catch { return { ...EMPTY_BUSINESS }; }
}
