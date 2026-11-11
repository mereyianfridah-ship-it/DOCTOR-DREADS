import { useState } from "react";
import { adminPayments } from "../../api/endpoints";
import { AdminPage, DataTable, Pager } from "../../components/admin/AdminUi";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime, formatKSh } from "../../utils/format";

const PAGE = 50;

export default function AdminPayments() {
  const [offset, setOffset] = useState(0);
  const { data, loading, error, reload } = useAsync((s) => adminPayments({ limit: PAGE, offset }, s), [offset]);
  const rows = data ?? [];
  return (
    <AdminPage title="Payment records" description="Read-only. Records appear here once payment integration is live; nothing on this page marks anything paid.">
      <QueryState loading={loading} error={error} onRetry={reload}>
        <DataTable head={["When", "For", "Method", "Amount", "Receipt", "Status", "Review"]} empty={rows.length ? undefined : "No payment records yet."}>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="px-4 py-3 whitespace-nowrap">{formatDateTime(p.created_at)}</td>
              <td className="px-4 py-3">{p.kind} #{p.target_id}</td>
              <td className="px-4 py-3">{p.method}{p.phone ? <div className="text-xs text-charcoal/55">{p.phone}</div> : null}</td>
              <td className="px-4 py-3 whitespace-nowrap">{formatKSh(p.amount)}</td>
              <td className="px-4 py-3 font-mono text-xs">{p.receipt ?? "—"}</td>
              <td className="px-4 py-3"><StatusBadge label={p.status} tone={p.status === "succeeded" ? "olive" : p.status === "failed" ? "red" : "gold"} />{p.failure_reason && <div className="mt-1 text-xs text-charcoal/55">{p.failure_reason}</div>}</td>
              <td className="px-4 py-3">{p.needs_review ? <StatusBadge label="Needs review" tone="red" /> : "—"}</td>
            </tr>
          ))}
        </DataTable>
        <Pager offset={offset} pageSize={PAGE} count={rows.length} onChange={setOffset} />
      </QueryState>
    </AdminPage>
  );
}
