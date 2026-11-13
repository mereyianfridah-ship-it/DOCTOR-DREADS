import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Play, X } from "lucide-react";
import type { GalleryItem } from "../../types";
import { BeforeAfter } from "./BeforeAfter";
import { locsImage, braidsImage } from "../../utils/placeholderImages";

function GalleryImage({ g, index, setActive }: { g: GalleryItem; index: number; setActive: (i: number) => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = imgFailed;
  const placeholder = g.category.toLowerCase().includes("braid") ? braidsImage(index + 200) : locsImage(index + 200);
  return (
    <li key={g.id} className="break-inside-avoid">
      <button
        type="button"
        onClick={() => setActive(index)}
        className="group relative block w-full overflow-hidden rounded-2xl bg-cream text-left"
        aria-label={`Open ${g.title}`}
      >
        <img
          src={showPlaceholder ? placeholder : g.image}
          alt={`${g.title} (placeholder)`}
          loading="lazy"
          decoding="async"
          onError={() => setImgFailed(true)}
          className={`w-full object-cover transition duration-500 group-hover:scale-105 ${index % 3 === 0 ? "aspect-[4/5]" : "aspect-square"}`}
        />
        {g.isVideo && (
          <span className="absolute inset-0 flex items-center justify-center bg-charcoal/30">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold text-charcoal">
              <Play className="h-6 w-6" aria-hidden />
            </span>
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-charcoal/85 to-transparent p-4 pt-10 text-sm font-medium text-offwhite opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          {g.title}
          {g.afterImage ? " · Before & After" : ""}
        </span>
      </button>
    </li>
  );
}

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") setActive((i) => (i === null ? i : (i + 1) % items.length));
      if (e.key === "ArrowLeft") setActive((i) => (i === null ? i : (i - 1 + items.length) % items.length));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active, items.length]);

  // Close the lightbox if the filtered list shrinks beneath the active index
  useEffect(() => {
    if (active !== null && active >= items.length) setActive(null);
  }, [items.length, active]);

  const current = active !== null ? items[active] : undefined;

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4">
        {items.map((g, i) => (
          <GalleryImage key={g.id} g={g} index={i} setActive={setActive} />
        ))}
      </ul>

      {current && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/95 p-4" role="dialog" aria-modal="true" aria-label={current.title}>
          <button type="button" onClick={() => setActive(null)} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-offwhite/10 p-3 text-offwhite hover:bg-offwhite/20">
            <X className="h-6 w-6" />
          </button>
          {items.length > 1 && (
            <>
              <button type="button" onClick={() => setActive((active! - 1 + items.length) % items.length)} aria-label="Previous" className="absolute left-3 rounded-full bg-offwhite/10 p-3 text-offwhite hover:bg-offwhite/20">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button type="button" onClick={() => setActive((active! + 1) % items.length)} aria-label="Next" className="absolute right-3 rounded-full bg-offwhite/10 p-3 text-offwhite hover:bg-offwhite/20">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          <div className="w-full max-w-xl">
            {current.afterImage ? (
              <BeforeAfter before={current.image} after={current.afterImage} title={current.title} />
            ) : (
              <img src={current.image} alt={current.title} className="max-h-[75vh] w-full rounded-2xl object-contain" />
            )}
            <p className="mt-4 text-center text-offwhite">{current.title}</p>
            {current.isVideo && (
              <p className="mt-1 text-center text-sm text-cream/70">Video placeholder: real video content will be added here.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
