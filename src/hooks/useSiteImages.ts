import { useEffect, useState } from "react";
import { getSiteImages, type SiteImageMap } from "../api/endpoints";
import type { SiteImageSlot } from "../config/siteImages";

let cache: SiteImageMap | null = null;
let inflight: Promise<SiteImageMap> | null = null;
const listeners = new Set<(m: SiteImageMap | null) => void>();

function load(): Promise<SiteImageMap> {
  inflight ??= getSiteImages()
    .then((m) => (cache = m))
    .catch(() => ({}) as SiteImageMap) // a failed lookup just means "use the default images"
    .finally(() => { inflight = null; });
  return inflight;
}

/** Call after the owner uploads or resets an image so the page shows the change straight away. */
export function invalidateSiteImages(): void {
  cache = null;
  inflight = null;
  listeners.forEach((l) => l(null));
}

/** All owner-uploaded images, fetched once and shared by every component that needs one. */
export function useSiteImages(): { loaded: boolean; images: SiteImageMap } {
  const [images, setImages] = useState<SiteImageMap | null>(cache);
  useEffect(() => {
    let live = true;
    const onChange = (m: SiteImageMap | null) => {
      if (m) setImages(m);
      else void load().then((x) => live && setImages(x));
    };
    listeners.add(onChange);
    if (!cache) void load().then((x) => live && setImages(x));
    return () => { live = false; listeners.delete(onChange); };
  }, []);
  return { loaded: images !== null, images: images ?? {} };
}

export function useSiteImage(slot: SiteImageSlot) {
  const { loaded, images } = useSiteImages();
  return { loaded, image: images[slot] };
}
