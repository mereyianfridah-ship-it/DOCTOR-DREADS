import { loadRules } from "./closureStore.js";
import { salonClosedReason } from "./closures.js";

/** The reason text (possibly "") when the whole salon is closed all day on `date` (one-off or recurring), otherwise null. */
export async function closedReason(date: string): Promise<string | null> {
  return salonClosedReason(await loadRules(), date);
}
