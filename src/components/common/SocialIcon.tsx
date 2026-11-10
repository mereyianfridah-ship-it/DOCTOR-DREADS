import { Music2 } from "lucide-react";

export function SocialIcon({ id, className = "h-5 w-5" }: { id: string; className?: string }) {
  if (id === "instagram")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  if (id === "facebook")
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M14 8.5V6.9c0-.8.2-1.2 1.3-1.2H17V2.6C16.6 2.5 15.6 2.4 14.5 2.4 12 2.4 10.3 3.9 10.3 6.6v1.9H7.5v3.3h2.8v9.8H14v-9.8h2.6l.4-3.3H14z" />
      </svg>
    );
  return <Music2 className={className} aria-hidden />;
}
