import { useEffect, useState } from "react";
import { getBusiness } from "../api/endpoints";
import { siteConfig } from "../config/site";
import type { BusinessPublic } from "../types";

/** Used until the server answers (and if it never does): the static, mostly empty defaults. */
const FALLBACK: BusinessPublic = { location: siteConfig.location, contact: siteConfig.contact, social: siteConfig.social };

let cache: BusinessPublic | null = null;
let inflight: Promise<BusinessPublic> | null = null;
const listeners = new Set<(b: BusinessPublic) => void>();

function load(): Promise<BusinessPublic> {
  inflight ??= getBusiness()
    .then((b) => {
      // An owner who hasn't set a location yet keeps the default one.
      cache = { ...b, location: b.location || siteConfig.location };
      return cache;
    })
    .catch(() => FALLBACK) // a failed lookup must never break the footer or contact page
    .finally(() => { inflight = null; });
  return inflight;
}

/** Call after the owner saves Admin > Settings so open pages show the change straight away. */
export function invalidateBusiness(): void {
  cache = null;
  void load().then((b) => listeners.forEach((l) => l(b)));
}

/** Contact details, hours, location and social links, fetched once and shared by every component. */
export function useBusiness(): BusinessPublic {
  const [b, setB] = useState<BusinessPublic>(cache ?? FALLBACK);
  useEffect(() => {
    let live = true;
    const onChange = (x: BusinessPublic) => { if (live) setB(x); };
    listeners.add(onChange);
    if (!cache) void load().then(onChange);
    return () => { live = false; listeners.delete(onChange); };
  }, []);
  return b;
}
