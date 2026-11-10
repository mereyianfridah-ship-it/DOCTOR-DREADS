import { Search, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search products" }: Props) {
  return (
    <div className="relative">
      <label htmlFor="site-search" className="sr-only">
        {placeholder}
      </label>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/50" aria-hidden />
      <input
        id="site-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pl-11 pr-10"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-charcoal/60 hover:bg-charcoal/10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
