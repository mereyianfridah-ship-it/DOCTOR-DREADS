import type { ReactNode } from "react";

interface Props {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}

export function FormField({ label, htmlFor, error, hint, optional, children }: Props) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-charcoal">
        {label}
        {optional && <span className="ml-1 font-normal text-charcoal/50">(optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-charcoal/55">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
