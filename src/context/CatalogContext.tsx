import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { errorMessage } from "../api/client";
import { getConfig, getProducts, getServices } from "../api/endpoints";
import type { Product, Service, SiteRules } from "../types";

interface CatalogValue {
  status: "loading" | "ready" | "error";
  error: string | null;
  services: Service[];
  products: Product[];
  rules: SiteRules | null;
  getService: (slug: string) => Service | undefined;
  getProduct: (slug: string) => Product | undefined;
  /** Re-fetch everything (e.g. after a stock conflict at checkout). */
  reload: () => Promise<void>;
}

const CatalogContext = createContext<CatalogValue | null>(null);

/** Loads services, products and business rules from the API once; all pages read from here. */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CatalogValue["status"]>("loading");
  const [error, setError] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [rules, setRules] = useState<SiteRules | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const [s, p, r] = await Promise.all([getServices(signal), getProducts(signal), getConfig(signal)]);
      if (signal?.aborted) return;
      setServices(s);
      setProducts(p);
      setRules(r);
      setError(null);
      setStatus("ready");
    } catch (e) {
      if (signal?.aborted || (e instanceof DOMException && e.name === "AbortError")) return;
      setError(errorMessage(e));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const ctl = new AbortController();
    void load(ctl.signal);
    return () => ctl.abort();
  }, [load]);

  const reload = useCallback(async () => {
    setStatus((s) => (s === "ready" ? s : "loading"));
    await load();
  }, [load]);

  const value = useMemo<CatalogValue>(
    () => ({
      status, error, services, products, rules,
      getService: (slug) => services.find((s) => s.slug === slug),
      getProduct: (slug) => products.find((p) => p.slug === slug),
      reload,
    }),
    [status, error, services, products, rules, reload],
  );
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog(): CatalogValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within a CatalogProvider");
  return ctx;
}
