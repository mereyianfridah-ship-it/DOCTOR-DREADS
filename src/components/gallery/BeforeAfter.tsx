export function BeforeAfter({ before, after, title }: { before: string; after: string; title: string }) {
  return (
    <figure className="grid grid-cols-2 gap-1 overflow-hidden rounded-2xl">
      <div className="relative aspect-[4/5]">
        <img src={before} alt={`${title}: before (sample)`} loading="lazy" className="h-full w-full object-cover" />
        <figcaption className="absolute bottom-3 left-3 rounded-full bg-charcoal/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-offwhite">Before</figcaption>
      </div>
      <div className="relative aspect-[4/5]">
        <img src={after} alt={`${title}: after (sample)`} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute bottom-3 left-3 rounded-full bg-gold px-3 py-1 text-xs font-semibold uppercase tracking-wider text-charcoal">After</span>
      </div>
    </figure>
  );
}
