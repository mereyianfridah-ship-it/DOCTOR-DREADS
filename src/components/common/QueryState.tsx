import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { LoadingSpinner } from "./LoadingSpinner";

interface Props {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  /** Rendered only when not loading and no error. */
  children: ReactNode;
  loadingLabel?: string;
}

/** Consistent loading / error / retry handling for any API-backed section. */
export function QueryState({ loading, error, onRetry, children, loadingLabel }: Props) {
  if (loading) return <LoadingSpinner label={loadingLabel} />;
  if (error)
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center px-4 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-red-700" aria-hidden />
        <p className="mt-3 font-semibold">We couldn&apos;t load this</p>
        <p className="mt-1 text-sm text-charcoal/70">{error}</p>
        {onRetry && <Button className="mt-5" variant="outline" onClick={onRetry}>Try again</Button>}
      </div>
    );
  return <>{children}</>;
}
