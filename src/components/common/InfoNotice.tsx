import { Info } from "lucide-react";
import type { ReactNode } from "react";

export function InfoNotice({ children, className = "" }: { children: ReactNode; className?: string }) {
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

