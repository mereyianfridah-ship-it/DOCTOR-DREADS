import type { Tone } from "../../utils/status";

const tones: Record<Tone, string> = {
  gold: "bg-gold/25 text-brown",
  olive: "bg-olive/15 text-olive",
  red: "bg-red-100 text-red-800",
  grey: "bg-charcoal/10 text-charcoal/70",
};

export function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>{label}</span>;
}
