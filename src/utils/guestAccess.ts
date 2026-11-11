/**
 * Guests prove ownership of a booking/order with the email they used.
 * We keep that email in sessionStorage (this tab only) so the status page keeps working on refresh.
 */
const key = (kind: "order" | "booking", ref: string) => `drdread.guest.${kind}.${ref.toUpperCase()}`;

export function rememberGuestEmail(kind: "order" | "booking", ref: string, email: string): void {
  try {
    window.sessionStorage.setItem(key(kind, ref), email);
  } catch {
    /* ignore */
  }
}
export function recallGuestEmail(kind: "order" | "booking", ref: string): string | undefined {
  try {
    return window.sessionStorage.getItem(key(kind, ref)) ?? undefined;
  } catch {
    return undefined;
  }
}
