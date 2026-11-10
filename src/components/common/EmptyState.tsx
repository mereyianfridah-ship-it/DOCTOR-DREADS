import type { ReactNode } from "react";

interface Props {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center">
      {icon && <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-cream text-brown">{icon}</div>}
      <h3 className="text-2xl">{title}</h3>
      {description && <p className="mt-2 text-charcoal/70">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
