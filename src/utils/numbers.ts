/** Parses a non-negative whole-number field (e.g. integer KSh); returns null when invalid. */
export function parseWhole(v: string): number | null {
  const t = v.trim();
  if (!/^\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
}
