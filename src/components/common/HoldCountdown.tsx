import { useEffect, useState } from "react";
import { Timer } from "lucide-react";
import { formatCountdown, remainingSeconds } from "../../utils/status";

/** Live countdown to a hold's expiry. Calls onExpire once when it reaches zero. */
export function HoldCountdown({ expiresAt, onExpire, label = "Held for" }: { expiresAt: string | null; onExpire?: () => void; label?: string }) {
  const [secs, setSecs] = useState(() => remainingSeconds(expiresAt));

  useEffect(() => {
    setSecs(remainingSeconds(expiresAt));
    if (!expiresAt) return;
    const id = window.setInterval(() => setSecs(remainingSeconds(expiresAt)), 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (expiresAt && secs === 0) onExpire?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secs === 0, expiresAt]);

  if (!expiresAt) return null;
  return (
    <p className="inline-flex items-center gap-2 text-sm font-semibold text-brown" role="timer" aria-live="off">
      <Timer className="h-4 w-4" aria-hidden />
      {secs > 0 ? `${label} ${formatCountdown(secs)}` : "Hold expired"}
    </p>
  );
}
