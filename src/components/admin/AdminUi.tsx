import type { ReactNode } from "react";
import { Button } from "../common/Button";

export function AdminPage({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-charcoal/65">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/** Responsive table wrapper: scrolls horizontally on small screens instead of breaking the page. */
export function DataTable({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-charcoal/10 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-cream/60 text-xs uppercase tracking-wider text-charcoal/60">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-charcoal/10 align-top">{children}</tbody>
      </table>
      {empty && <p className="px-4 py-8 text-center text-sm text-charcoal/60">{empty}</p>}
    </div>
  );
}

export function Pager({ offset, pageSize, count, onChange }: { offset: number; pageSize: number; count: number; onChange: (offset: number) => void }) {
  if (offset === 0 && count < pageSize) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - pageSize))}>Previous</Button>
      <span className="text-charcoal/60">Showing {offset + 1}–{offset + count}</span>
      <Button size="sm" variant="outline" disabled={count < pageSize} onClick={() => onChange(offset + pageSize)}>Next</Button>
    </div>
  );
}

export function StatusSelect({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string }) {
  return (
    <div>
      <label htmlFor={`f-${label}`} className="sr-only">{label}</label>
      <select id={`f-${label}`} value={value} onChange={(e) => onChange(e.target.value)} className="input-base !w-auto !py-2 text-sm">
        <option value="">All statuses</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
