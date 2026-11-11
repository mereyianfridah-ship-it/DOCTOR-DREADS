import { Link } from "react-router-dom";
import { adminSummary } from "../../api/endpoints";
import { AdminPage } from "../../components/admin/AdminUi";
import { QueryState } from "../../components/common/QueryState";
import { useAsync } from "../../hooks/useAsync";
import { formatKSh } from "../../utils/format";

export default function AdminOverview() {
  const { data, loading, error, reload } = useAsync((s) => adminSummary(s), []);
  const cards = data
    ? [
        { label: "Slots awaiting deposit", value: data.pendingBookings, to: "/admin/bookings" },
        { label: "Confirmed bookings", value: data.confirmedUpcomingBookings, to: "/admin/bookings" },
        { label: "Orders to fulfil", value: data.ordersToFulfil, to: "/admin/orders" },
        { label: "New consultations", value: data.newConsultations, to: "/admin/consultations" },
        { label: "Unhandled messages", value: data.unreadMessages, to: "/admin/messages" },
        { label: "Payments needing review", value: data.paymentsNeedingReview, to: "/admin/payments" },
      ]
    : [];
  return (
    <AdminPage title="Overview" description="Live counts from the database.">
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data && (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {cards.map((c) => (
                <li key={c.label}>
                  <Link to={c.to} className="block rounded-2xl border border-charcoal/10 bg-white p-6 transition hover:border-gold">
                    <p className="text-sm text-charcoal/65">{c.label}</p>
                    <p className="mt-2 font-display text-4xl">{c.value}</p>
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-2xl border border-charcoal/10 bg-white p-6">
              <p className="text-sm text-charcoal/65">Recorded successful payments</p>
              <p className="mt-2 font-display text-4xl">{formatKSh(data.revenue)}</p>
              <p className="mt-2 text-xs text-charcoal/55">Sum of payment records marked succeeded. Online payment is not connected yet, so this reflects only verified records.</p>
            </div>
          </>
        )}
      </QueryState>
    </AdminPage>
  );
}
