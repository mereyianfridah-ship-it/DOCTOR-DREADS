import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "../api/client";
import { cancelOrder, getOrder } from "../api/endpoints";
import { ConfirmAction } from "../components/common/ConfirmAction";
import { HoldCountdown } from "../components/common/HoldCountdown";
import { PageHeader } from "../components/common/PageHeader";
import { QueryState } from "../components/common/QueryState";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAsync } from "../hooks/useAsync";
import type { OrderRecord } from "../types";
import { formatDateTime, formatKSh } from "../utils/format";
import { recallGuestEmail, rememberGuestEmail } from "../utils/guestAccess";
import { orderStatusInfo } from "../utils/status";

function progress(o: OrderRecord): { label: string; done: boolean }[] {
  const order = ["pending_payment", "paid", "processing", "shipped", "delivered"] as const;
  const idx = order.indexOf(o.status as (typeof order)[number]);
  const labels = ["Pending payment", "Paid", "Processing", o.method === "collection" ? "Ready for collection" : "Out for delivery", "Completed"];
  return labels.map((label, i) => ({ label, done: idx >= i }));
}

/** Order confirmation, tracking and detail for signed-in owners or guests (email kept in this tab only). */
export default function OrderStatus() {
  const { reference = "" } = useParams();
  const [params] = useSearchParams();
  const fromQuery = params.get("email") ?? undefined;
  if (fromQuery) rememberGuestEmail("order", reference, fromQuery);
  const email = fromQuery ?? recallGuestEmail("order", reference);
  const { data, loading, error, reload } = useAsync((s) => getOrder(reference, email, s), [reference, email]);
  const [busy, setBusy] = useState(false);
  const o = data?.order;
  const closed = o?.status === "cancelled" || o?.status === "expired";

  const cancel = async () => {
    setBusy(true);
    try {
      await cancelOrder(reference, email);
      toast.success("Order cancelled and stock released.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Order" title={`Order ${reference.toUpperCase()}`} />
      <section className="section">
        <div className="container-page max-w-3xl">
          <Link to="/account/orders" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brown hover:underline"><ArrowLeft className="h-4 w-4" /> My orders</Link>
          <QueryState loading={loading} error={error} onRetry={reload}>
            {o && (
              <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-charcoal/60">Placed {formatDateTime(o.createdAt)}</p>
                  <StatusBadge {...orderStatusInfo(o.status, o.method)} />
                </div>

                {o.status === "pending_payment" && (
                  <div className="mt-5 rounded-xl border border-gold/40 bg-gold/10 p-4 text-sm">
                    <HoldCountdown expiresAt={o.expiresAt} label="Stock held for" onExpire={reload} />
                    <p className="mt-2 text-charcoal/80">
                      This order has <strong>not been paid</strong> and will not be processed until it is paid in full. Online payment is not available yet, so the stock hold will lapse and the order
                      will expire automatically.
                    </p>
                  </div>
                )}
                {o.status === "expired" && <p className="mt-5 text-sm text-charcoal/70">The hold ended without payment; the items were returned to stock. You can <Link to="/shop" className="font-semibold text-brown underline">shop again</Link>.</p>}

                {!closed && (
                  <ol className="mt-6 grid gap-2 sm:grid-cols-5" aria-label="Order progress">
                    {progress(o).map((p) => (
                      <li key={p.label} className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${p.done ? "bg-olive/15 text-olive" : "bg-charcoal/5 text-charcoal/50"}`}>{p.label}</li>
                    ))}
                  </ol>
                )}

                <ul className="mt-6 divide-y divide-charcoal/10 border-y border-charcoal/10">
                  {o.items.map((i) => (
                    <li key={i.productId} className="flex justify-between gap-4 py-3 text-sm">
                      <span>{i.name} × {i.quantity}</span>
                      <span className="font-semibold">{formatKSh(i.unitPrice * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatKSh(o.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt>{o.method === "delivery" ? "Delivery" : "Collection"}</dt><dd>{o.deliveryFee ? formatKSh(o.deliveryFee) : "Free"}</dd></div>
                  <div className="flex justify-between border-t border-charcoal/10 pt-3 text-lg font-bold"><dt>Total</dt><dd>{formatKSh(o.total)}</dd></div>
                </dl>
                <p className="mt-6 text-sm text-charcoal/70">
                  {o.method === "delivery" ? `Delivery to ${o.address ?? ""}${o.area ? ` (${o.area})` : ""}` : "Collection from the salon once ready"} · {o.name} · {o.phone}
                </p>

                {o.status === "pending_payment" && (
                  <div className="mt-8">
                    <ConfirmAction label="Cancel order" confirmLabel="Yes, cancel order" busy={busy} onConfirm={cancel} message="Cancel this unpaid order and release the reserved stock?" />
                  </div>
                )}
                {(o.status === "paid" || o.status === "processing" || o.status === "shipped") && (
                  <p className="mt-8 text-sm text-charcoal/65">Need to change or cancel a paid order? <Link to="/contact" className="font-semibold text-brown underline">Contact us</Link>.</p>
                )}
              </div>
            )}
          </QueryState>
        </div>
      </section>
    </>
  );
}
