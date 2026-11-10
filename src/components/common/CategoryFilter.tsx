interface Props {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  allLabel?: string;
  label?: string;
}

/** Horizontally scrollable pill filter used by Services, Shop and Gallery. */
export function CategoryFilter({ options, value, onChange, allLabel = "All", label = "Filter by category" }: Props) {
  const all = [allLabel, ...options];
  return (
    <div role="group" aria-label={label} className="-mx-5 overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
        {all.map((opt) => {
          const active = (opt === allLabel ? "" : opt) === value;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt === allLabel ? "" : opt)}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-charcoal bg-charcoal text-offwhite"
                  : "border-charcoal/20 bg-white text-charcoal hover:border-charcoal"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
