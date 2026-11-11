import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client";

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/** Runs `fn` on mount and whenever `deps` change; aborts stale requests. */
export function useAsync<T>(fn: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true);
    setError(null);
    fnRef.current(ctl.signal)
      .then((d) => {
        if (!ctl.signal.aborted) setData(d);
      })
      .catch((e: unknown) => {
        if (ctl.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
        setError(errorMessage(e));
      })
      .finally(() => {
        if (!ctl.signal.aborted) setLoading(false);
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
