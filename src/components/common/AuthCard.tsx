import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="container-page max-w-md">
        <div className="rounded-2xl border border-charcoal/10 bg-white p-8 shadow-sm">
          <h1 className="text-4xl">{title}</h1>
          <p className="mt-2 text-charcoal/65">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
