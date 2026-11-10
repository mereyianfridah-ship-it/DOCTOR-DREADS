import { Minus, Plus } from "lucide-react";

interface Props {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
  label?: string;
}

export function QuantitySelector({ value, min = 1, max, onChange, label = "Quantity" }: Props) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-full border border-charcoal/25 bg-white">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-charcoal/5 disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <span aria-live="polite" className="w-10 text-center text-sm font-semibold">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-charcoal/5 disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
