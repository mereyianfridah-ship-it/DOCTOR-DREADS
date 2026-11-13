import { useEffect, useState } from "react";
import { adminCustomers } from "../../api/endpoints";
import { AdminPage, DataTable, Pager } from "../../components/admin/AdminUi";
import { QueryState } from "../../components/common/QueryState";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime, formatKSh } from "../../utils/format";

const PAGE = 50;

export default function AdminCustomers() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);

  // Wait for a short pause in typing before querying the server.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(input.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data, loading, error, reload } = useAsync((s) => adminCustomers({ q, limit: PAGE, offset }, s), [q, offset]);
  const rows = data ?? [];

  return (
    <AdminPage title="Customers" description="Registered customer accounts, with their booking and order activity. Read-only.">
      <div className="mb-4">
        <label htmlFor="customer-search" className="sr-only">Search customers</label>
        <input
          id="customer-search"
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search by name, email or phone"
          className="input-base max-w-md"
        />
      </div>
      <QueryState loading={loading} error={error} onRetry={reload}>
        <DataTable
          head={["Customer", "Contact", "Bookings", "Orders", "Spent on orders", "Joined"]}
          empty={rows.length ? undefined : q ? "No customers match that search." : "No customers yet."}
        >
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium">{c.fullName}</td>
              <td className="px-4 py-3">
                <a className="underline" href={`mailto:${c.email}`}>{c.email}</a>
                <div className="text-xs text-charcoal/55">{c.phone}</div>
              </td>
              <td className="px-4 py-3">{c.bookings}</td>
              <td className="px-4 py-3">{c.orders}</td>
              <td className="px-4 py-3">{formatKSh(c.spent)}</td>
              <td className="px-4 py-3 text-charcoal/65">{formatDateTime(c.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
        <Pager offset={offset} pageSize={PAGE} count={rows.length} onChange={setOffset} />
      </QueryState>
    </AdminPage>
  );
}
