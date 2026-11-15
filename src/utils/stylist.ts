/** Display name for a stylist id: the live name when known, else a tidied version of the id. */
export function stylistLabel(id: string, known: { id: string; name: string }[] = []): string {
  const hit = known.find((s) => s.id === id);
  if (hit) return hit.name;
  return id.replace(/-\d+$/, "").split("-").filter(Boolean).map((w) => w[0]!.toUpperCase() + w.slice(1)).join(" ") || id;
}
