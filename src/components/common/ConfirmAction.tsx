import { useState } from "react";
import { Button } from "./Button";

/** Two-step destructive action: first click asks for confirmation inline (no browser dialogs). */
export function ConfirmAction({
  label, confirmLabel = "Yes, confirm", message, onConfirm, busy, variant = "outline", size = "sm",
}: {
  label: string; confirmLabel?: string; message: string; onConfirm: () => void | Promise<void>; busy?: boolean;
  variant?: "outline" | "ghost" | "secondary"; size?: "sm" | "md";
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) return <Button variant={variant} size={size} onClick={() => setAsking(true)} disabled={busy}>{label}</Button>;
  return (
    <div role="alertdialog" aria-label={label} className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
      <p className="text-red-900">{message}</p>
      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="secondary" disabled={busy} onClick={async () => { await onConfirm(); setAsking(false); }}>{busy ? "Working…" : confirmLabel}</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => setAsking(false)}>Keep it</Button>
      </div>
    </div>
  );
}
