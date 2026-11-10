import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <section className="bg-charcoal py-16 text-offwhite sm:py-20">
      <div className="container-page max-w-4xl text-center">
        {eyebrow && <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-gold">{eyebrow}</p>}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl">{title}</h1>
        {description && <p className="mx-auto mt-5 max-w-2xl text-lg text-cream/80">{description}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
