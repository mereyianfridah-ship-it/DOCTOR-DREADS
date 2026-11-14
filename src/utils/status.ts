import type { BookingStatus, ConsultationStatus, OrderRecord, OrderStatus } from "../types";

export type Tone = "gold" | "olive" | "red" | "grey";

export const bookingStatusInfo: Record<BookingStatus, { label: string; tone: Tone }> = {
  pending_deposit: { label: "Awaiting deposit", tone: "gold" },
  confirmed: { label: "Confirmed", tone: "olive" },
  completed: { label: "Completed", tone: "olive" },
  cancelled: { label: "Cancelled", tone: "red" },
  expired: { label: "Hold expired", tone: "grey" },
};

/** The backend stores "shipped" for both delivery and collection orders; the label depends on the method. */
export function orderStatusInfo(status: OrderStatus, method?: OrderRecord["method"]): { label: string; tone: Tone } {
  switch (status) {
    case "pending_payment": return { label: "Pending payment", tone: "gold" };
    case "paid": return { label: "Paid", tone: "olive" };
    case "processing": return { label: "Processing", tone: "olive" };
    case "shipped": return { label: method === "collection" ? "Ready for collection" : "Out for delivery", tone: "olive" };
    case "delivered": return { label: "Completed", tone: "olive" };
    case "cancelled": return { label: "Cancelled", tone: "red" };
    case "expired": return { label: "Hold expired", tone: "grey" };
  }
}

export const consultationStatusInfo: Record<ConsultationStatus, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "gold" },
  contacted: { label: "Contacted", tone: "olive" },
  quoted: { label: "Quoted", tone: "olive" },
  closed: { label: "Closed", tone: "grey" },
};

/** Steps shown to the customer, in order. "closed" is a terminal state, not a step. */
export const consultationSteps: { status: Exclude<ConsultationStatus, "closed">; label: string }[] = [
  { status: "new", label: "Received" },
  { status: "contacted", label: "We've been in touch" },
  { status: "quoted", label: "Quotation ready" },
];

/** Index of the current step (0-based). A closed request has completed every step the salon took. */
export function consultationStepIndex(status: ConsultationStatus): number {
  if (status === "closed") return consultationSteps.length - 1;
  return consultationSteps.findIndex((s) => s.status === status);
}

export const consultationCustomerMessage: Record<ConsultationStatus, string> = {
  new: "We have your request and photos. We'll review them and contact you with a recommendation.",
  contacted: "We've been in touch about your request. If you haven't heard from us, please contact the salon.",
  quoted: "Your quotation is ready. Contact the salon to agree the next step; nothing is booked or charged automatically.",
  closed: "This request is closed. You're welcome to start a new consultation at any time.",
};

/** Minutes:seconds remaining until an ISO timestamp (never negative). */
export function remainingSeconds(expiresAt: string | null | undefined, now = Date.now()): number {
  if (!expiresAt) return 0;
  const t = Date.parse(expiresAt);
  return Number.isFinite(t) ? Math.max(0, Math.floor((t - now) / 1000)) : 0;
}
export function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
