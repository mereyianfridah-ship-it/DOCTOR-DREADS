import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminBookings, adminSetBookingStatus } from "../../api/endpoints";
import { AdminPage, DataTable, Pager, StatusSelect } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { ConfirmAction } from "../../components/common/ConfirmAction";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { formatKSh, formatLongDate } from "../../utils/format";
import { bookingStatusInfo } from "../../utils/status";

const PAGE = 50;

export default function AdminBookings() {
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync((s) => adminBookings({ status, limit: PAGE, offset }, s), [status, offset]);

  const act = async (reference: string, next: "completed" | "cancelled") => {
    setBusy(reference);
    try {
      await adminSetBookingStatus(reference, next);
      toast.success(`Booking ${next}.`);
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
      title="Bookings"
      description="Appointments become confirmed only when a verified deposit is recorded; there is deliberately no manual confirm button until payment verification is integrated."
      actions={<StatusSelect label="Booking status" value={status} onChange={(v) => { setStatus(v); setOffset(0); }} options={Object.entries(bookingStatusInfo).map(([value, i]) => ({ value, label: i.label }))} />}
    >
      <QueryState loading={loading} error={error} onRetry={reload}>
        <DataTable head={["Reference", "Service", "When", "Customer", "Deposit", "Status", "Actions"]} empty={rows.length ? undefined : "No bookings found."}>
          {rows.map((b) => (
            <tr key={b.reference}>
              <td className="px-4 py-3 font-mono text-xs">{b.reference}</td>
              <td className="px-4 py-3">{b.service}<div className="text-xs text-charcoal/55">{b.location === "salon" ? "Salon" : "Mobile"} · {b.stylistId}</div></td>
              <td className="px-4 py-3 whitespace-nowrap">{formatLongDate(b.date)}<div className="text-xs text-charcoal/55">{b.time}</div></td>
              <td className="px-4 py-3">{b.fullName}<div className="text-xs text-charcoal/55">{b.phone} · {b.email}</div>{b.notes && <div className="mt-1 text-xs italic text-charcoal/60">“{b.notes}”</div>}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatKSh(b.depositAmount)}</td>
              <td className="px-4 py-3"><StatusBadge {...bookingStatusInfo[b.status]} /></td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {b.status === "confirmed" && <Button size="sm" variant="secondary" disabled={busy === b.reference} onClick={() => void act(b.reference, "completed")}>Mark completed</Button>}
                  {(b.status === "pending_deposit" || b.status === "confirmed") && (
                    <ConfirmAction label="Cancel" confirmLabel="Cancel booking" busy={busy === b.reference} onConfirm={() => act(b.reference, "cancelled")} message="Cancel this booking and release the slot? Any refund must be handled separately." />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
        <Pager offset={offset} pageSize={PAGE} count={rows.length} onChange={setOffset} />
      </QueryState>
    </AdminPage>
  );
}
