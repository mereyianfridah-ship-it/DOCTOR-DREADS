/**
 * Guests prove ownership of a booking/order with the email they used (consultations: email or phone).
 * We keep that email in sessionStorage (this tab only) so the status page keeps working on refresh.
 */
export type GuestKind = "order" | "booking" | "consultation";
const key = (kind: GuestKind, ref: string) => `drdread.guest.${kind}.${ref.toUpperCase()}`;

export function rememberGuestEmail(kind: GuestKind, ref: string, email: string): void {
  try {
    window.sessionStorage.setItem(key(kind, ref), email);
  } catch {
    /* ignore */
  }
}
export function recallGuestEmail(kind: GuestKind, ref: string): string | undefined {
  try {
    return window.sessionStorage.getItem(key(kind, ref)) ?? undefined;
  } catch {
    return undefined;
  }
}
