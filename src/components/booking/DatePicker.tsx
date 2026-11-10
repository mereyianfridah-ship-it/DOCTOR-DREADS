import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isOpenDay } from "../../utils/availability";
import { parseISODate, toISODate } from "../../utils/format";

interface Props {
  value: string;
  onChange: (iso: string) => void;
  minDate: Date;
  maxDate: Date;
}

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DatePicker({ value, onChange, minDate, maxDate }: Props) {
  const initial = value ? parseISODate(value) : minDate;
  const [view, setView] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const firstDow = view.getDay();
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(view.getFullYear(), view.getMonth(), i + 1)),
  ];

  const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const maxMonth = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  const canPrev = view > minMonth;
  const canNext = view < maxMonth;
  const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  return (
    <div className="rounded-2xl border border-charcoal/10 bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} aria-label="Previous month" className="rounded-full p-2 hover:bg-charcoal/5 disabled:opacity-30">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-xl" aria-live="polite">
          {view.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
        </h3>
        <button type="button" disabled={!canNext} onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} aria-label="Next month" className="rounded-full p-2 hover:bg-charcoal/5 disabled:opacity-30">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-charcoal/50">
        {weekdays.map((w) => <div key={w} className="py-2">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const iso = toISODate(d);
          const t = stripTime(d);
          const disabled = t < stripTime(minDate) || t > stripTime(maxDate) || !isOpenDay(iso);
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              aria-pressed={selected}
              aria-label={d.toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}
              className={`aspect-square rounded-lg text-sm font-medium transition ${
                selected ? "bg-charcoal text-offwhite" : disabled ? "cursor-not-allowed text-charcoal/25" : "hover:bg-gold/25"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-charcoal/55">Greyed-out days are unavailable (demo availability).</p>
    </div>
  );
}
