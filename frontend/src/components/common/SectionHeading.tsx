interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  light?: boolean;
}

export function SectionHeading({ eyebrow, title, description, align = "center", light }: Props) {
  return (
    <div className={`mx-auto max-w-2xl ${align === "center" ? "text-center" : "text-left mx-0"}`}>
      {eyebrow && (
        <p className={`mb-3 text-xs font-semibold uppercase tracking-[0.25em] ${light ? "text-gold" : "text-brown"}`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`text-3xl leading-tight sm:text-4xl lg:text-5xl ${light ? "text-offwhite" : "text-charcoal"}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base leading-relaxed sm:text-lg ${light ? "text-cream/80" : "text-charcoal/70"}`}>
          {description}
        </p>
      )}
    </div>
  );
}
