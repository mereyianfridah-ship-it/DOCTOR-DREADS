import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function DemoNotice({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={`flex items-start gap-3 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-sm text-charcoal/80 ${className}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-brown" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function DemoBadge({ children = "Demo" }: { children?: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-charcoal/80 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-offwhite">
      {children}
    </span>
  );
}
