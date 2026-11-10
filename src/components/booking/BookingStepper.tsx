import { Check } from "lucide-react";

interface Props {
  steps: readonly string[];
  current: number; // 0-based
}

export function BookingStepper({ steps, current }: Props) {
  return (
    <nav aria-label="Booking progress" className="mb-10">
      <p className="mb-2 text-sm font-medium text-charcoal/70 lg:hidden">
        Step {current + 1} of {steps.length}: <span className="text-charcoal">{steps[current]}</span>
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-charcoal/10 lg:hidden" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1}>
        <div className="h-full bg-gold transition-all duration-300" style={{ width: `${((current + 1) / steps.length) * 100}%` }} />
      </div>
      <ol className="hidden items-start lg:flex">
        {steps.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex flex-1 flex-col items-center text-center" aria-current={active ? "step" : undefined}>
              <div className="flex w-full items-center">
                <span className={`h-0.5 flex-1 ${i === 0 ? "invisible" : done || active ? "bg-gold" : "bg-charcoal/15"}`} />
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                    done ? "border-gold bg-gold text-charcoal" : active ? "border-charcoal bg-charcoal text-offwhite" : "border-charcoal/20 text-charcoal/50"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                </span>
                <span className={`h-0.5 flex-1 ${i === steps.length - 1 ? "invisible" : done ? "bg-gold" : "bg-charcoal/15"}`} />
              </div>
              <span className={`mt-2 text-xs ${active ? "font-semibold text-charcoal" : "text-charcoal/55"}`}>{label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
