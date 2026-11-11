import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "../api/client";
import { cancelBooking, getBooking } from "../api/endpoints";
import { ConfirmAction } from "../components/common/ConfirmAction";
import { HoldCountdown } from "../components/common/HoldCountdown";
import { PageHeader } from "../components/common/PageHeader";
import { QueryState } from "../components/common/QueryState";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAsync } from "../hooks/useAsync";
import { formatKSh, formatLongDate } from "../utils/format";
import { recallGuestEmail, rememberGuestEmail } from "../utils/guestAccess";
import { bookingStatusInfo } from "../utils/status";

/** Booking detail for signed-in owners, or guests who supply the booking email (kept in this tab only). */
export default function BookingStatus() {
  const { reference = "" } = useParams();
  const [params] = useSearchParams();
  const fromQuery = params.get("email") ?? undefined;
  if (fromQuery) rememberGuestEmail("booking", reference, fromQuery);
  const email = fromQuery ?? recallGuestEmail("booking", reference);
  const { data, loading, error, reload } = useAsync((s) => getBooking(reference, email, s), [reference, email]);
  const [busy, setBusy] = useState(false);

  const b = data?.booking;
  const info = b ? bookingStatusInfo[b.status] : null;

  const cancel = async () => {
    setBusy(true);
    try {
      const r = await cancelBooking(reference, email);
      toast.success(r.note ?? "Booking cancelled.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Booking" title={`Booking ${reference.toUpperCase()}`} />
      <section className="section">
        <div className="container-page max-w-3xl">
          <Link to="/account/bookings" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brown hover:underline"><ArrowLeft className="h-4 w-4" /> My bookings</Link>
          <QueryState loading={loading} error={error} onRetry={reload}>
            {b && info && (
              <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-3xl">{b.service}</h2>
                  <StatusBadge {...info} />
                </div>
                {b.status === "pending_deposit" && (
                  <div className="mt-5 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
                    <HoldCountdown expiresAt={b.expiresAt} onExpire={reload} />
                    <p className="mt-2 text-charcoal/80">
                      This appointment is <strong>not confirmed</strong>. A deposit of <strong>{formatKSh(b.depositAmount)}</strong> is required. Online deposit payment is not available yet, so
                      this hold will lapse automatically. Please contact us before it ends to arrange your deposit.
                    </p>
                  </div>
                )}
                {b.status === "expired" && <p className="mt-5 text-sm text-charcoal/70">The hold on this slot ended without a deposit and the slot was released. You are welcome to <Link to="/booking" className="font-semibold text-brown underline">book again</Link>.</p>}
                <dl className="mt-6 divide-y divide-charcoal/10 text-sm">
                  {[
                    ["Date", formatLongDate(b.date)], ["Time", b.time], ["Location", b.location === "salon" ? "Physical salon" : "Mobile service"],
                    ["Stylist", b.stylistId], ["Name", b.fullName], ["Phone", b.phone], ["Email", b.email], ["Notes", b.notes || "None"], ["Deposit", formatKSh(b.depositAmount)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-6 py-3"><dt className="text-charcoal/60">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                  ))}
                </dl>
                {(b.status === "pending_deposit" || b.status === "confirmed") && (
                  <div className="mt-8">
                    <ConfirmAction
                      label="Cancel booking" confirmLabel="Yes, cancel booking" busy={busy} onConfirm={cancel}
                      message={b.status === "confirmed" ? "Cancel this confirmed booking? Any refund is decided by the salon under its cancellation policy; none is issued automatically." : "Cancel this held slot?"}
                    />
                  </div>
                )}
              </div>
            )}
          </QueryState>
        </div>
      </section>
    </>
  );
}
