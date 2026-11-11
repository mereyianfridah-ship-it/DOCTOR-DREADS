import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminOrders, adminSetOrderStatus } from "../../api/endpoints";
import { AdminPage, DataTable, Pager, StatusSelect } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { ConfirmAction } from "../../components/common/ConfirmAction";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import type { OrderRecord } from "../../types";
import { formatDateTime, formatKSh } from "../../utils/format";
import { orderStatusInfo } from "../../utils/status";

const PAGE = 50;
const statusOptions = (["pending_payment", "paid", "processing", "shipped", "delivered", "cancelled", "expired"] as const).map((value) => ({ value, label: orderStatusInfo(value).label.replace("Out for delivery", "Out for delivery / ready") }));

function nextStep(o: OrderRecord): { to: "processing" | "shipped" | "delivered"; label: string } | null {
  if (o.status === "paid") return { to: "processing", label: "Start processing" };
  if (o.status === "processing") return { to: "shipped", label: o.method === "collection" ? "Ready for collection" : "Out for delivery" };
  if (o.status === "shipped") return { to: "delivered", label: "Mark completed" };
  return null;
}

export default function AdminOrders() {
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync((s) => adminOrders({ status, limit: PAGE, offset }, s), [status, offset]);

  const act = async (reference: string, next: "processing" | "shipped" | "delivered" | "cancelled") => {
    setBusy(reference);
    try {
      await adminSetOrderStatus(reference, next);
      toast.success("Order updated.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const rows = data ?? [];
  return (
    <AdminPage
      title="Orders"
      description="Only paid orders can enter fulfilment; unpaid orders show no actions. Cancelling returns stock; refunds are recorded manually until payment integration."
      actions={<StatusSelect label="Order status" value={status} onChange={(v) => { setStatus(v); setOffset(0); }} options={statusOptions} />}
    >
      <QueryState loading={loading} error={error} onRetry={reload}>
        <DataTable head={["Reference", "Customer", "Items", "Total", "Method", "Status", "Actions"]} empty={rows.length ? undefined : "No orders found."}>
          {rows.map((o) => {
            const step = nextStep(o);
            const cancellable = ["paid", "processing", "shipped"].includes(o.status);
            return (
              <tr key={o.reference}>
                <td className="px-4 py-3 font-mono text-xs">{o.reference}<div className="font-sans text-charcoal/55">{formatDateTime(o.createdAt)}</div></td>
                <td className="px-4 py-3">{o.name}<div className="text-xs text-charcoal/55">{o.phone} · {o.email}</div></td>
                <td className="px-4 py-3">{o.items.map((i) => <div key={i.productId}>{i.name} × {i.quantity}</div>)}</td>
                <td className="px-4 py-3 whitespace-nowrap">{formatKSh(o.total)}<div className="text-xs text-charcoal/55">incl. {formatKSh(o.deliveryFee)} delivery</div></td>
                <td className="px-4 py-3">{o.method === "delivery" ? `Delivery${o.area ? ` · ${o.area}` : ""}` : "Collection"}{o.address && <div className="text-xs text-charcoal/55">{o.address}</div>}</td>
                <td className="px-4 py-3"><StatusBadge {...orderStatusInfo(o.status, o.method)} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {step && <Button size="sm" variant="secondary" disabled={busy === o.reference} onClick={() => void act(o.reference, step.to)}>{step.label}</Button>}
                    {cancellable && <ConfirmAction label="Cancel" confirmLabel="Cancel order" busy={busy === o.reference} onConfirm={() => act(o.reference, "cancelled")} message="Cancel this paid order and return its items to stock? Arrange any refund separately." />}
                  </div>
                </td>
              </tr>
            );
          })}
        </DataTable>
        <Pager offset={offset} pageSize={PAGE} count={rows.length} onChange={setOffset} />
      </QueryState>
    </AdminPage>
  );
}
