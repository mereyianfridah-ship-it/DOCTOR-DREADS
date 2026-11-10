import { siteConfig } from "../config/site";
import { parseISODate } from "./format";

/**
 * DEMONSTRATION availability only. Replace with an API call
 * (e.g. GET /api/availability?date=...&serviceId=...) in the backend phase.
 */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export function isOpenDay(iso: string): boolean {
  return siteConfig.booking.openDays.includes(parseISODate(iso).getDay());
}

export function getDemoSlots(iso: string, stylistId: string) {
  return siteConfig.booking.slots.map((time) => ({
    time,
    available: isOpenDay(iso) && hash(`${iso}|${time}|${stylistId}`) % 5 !== 0,
  }));
}
