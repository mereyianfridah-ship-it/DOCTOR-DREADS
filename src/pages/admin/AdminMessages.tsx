import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminMessages, adminSetMessageHandled } from "../../api/endpoints";
import { AdminPage, Pager } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime } from "../../utils/format";

const PAGE = 50;

export default function AdminMessages() {
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<number | null>(null);
  const { data, loading, error, reload } = useAsync((s) => adminMessages({ limit: PAGE, offset }, s), [offset]);

  const toggle = async (id: number, handled: boolean) => {
    setBusy(id);
    try {
      await adminSetMessageHandled(id, handled);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const rows = data ?? [];
  return (
    <AdminPage title="Contact messages" description="Messages sent through the website contact form.">
      <QueryState loading={loading} error={error} onRetry={reload}>
        {rows.length === 0 && <p className="rounded-2xl border border-charcoal/10 bg-white px-4 py-8 text-center text-sm text-charcoal/60">No messages yet.</p>}
        <ul className="space-y-4">
          {rows.map((m) => (
            <li key={m.id} className="rounded-2xl border border-charcoal/10 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl">{m.subject}</h2>
                  <p className="text-sm text-charcoal/65">{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ""} · {formatDateTime(m.created_at)}</p>
                </div>
                <StatusBadge label={m.handled ? "Handled" : "Unhandled"} tone={m.handled ? "olive" : "gold"} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{m.message}</p>
              <div className="mt-4">
                <Button size="sm" variant="outline" disabled={busy === m.id} onClick={() => void toggle(m.id, !m.handled)}>{m.handled ? "Mark unhandled" : "Mark handled"}</Button>
              </div>
            </li>
          ))}
        </ul>
        <Pager offset={offset} pageSize={PAGE} count={rows.length} onChange={setOffset} />
      </QueryState>
    </AdminPage>
  );
}
