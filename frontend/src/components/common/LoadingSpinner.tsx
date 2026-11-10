export function LoadingSpinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-charcoal/70">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}
