import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { getMyOrders } from "../../api/endpoints";
import { ButtonLink } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { AccountLayout } from "../../components/layout/AccountLayout";
import { useAsync } from "../../hooks/useAsync";
import { formatDateTime, formatKSh } from "../../utils/format";
import { orderStatusInfo } from "../../utils/status";

export default function AccountOrders() {
  const { data, loading, error, reload } = useAsync((s) => getMyOrders(s), []);
  return (
    <AccountLayout title="My orders">
      <QueryState loading={loading} error={error} onRetry={reload}>
        {!data || data.length === 0 ? (
          <EmptyState icon={<Package className="h-7 w-7" />} title="No orders yet" action={<ButtonLink to="/shop">Visit the Shop</ButtonLink>} />
        ) : (
          <ul className="space-y-4">
            {data.map((o) => (
              <li key={o.reference}>
                <Link to={`/orders/${o.reference}`} className="block rounded-2xl border border-charcoal/10 bg-white p-6 transition hover:border-gold">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-wider text-charcoal/50">{o.reference}</p>
                      <p className="text-sm text-charcoal/70">{formatDateTime(o.createdAt)}</p>
                    </div>
                    <StatusBadge {...orderStatusInfo(o.status, o.method)} />
                  </div>
                  <p className="mt-3">{o.items.map((i) => `${i.name} × ${i.quantity}`).join(", ")}</p>
                  <p className="mt-2 font-bold">{formatKSh(o.total)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <div className="mt-8"><ButtonLink to="/shop" variant="outline">Continue Shopping</ButtonLink></div>
    </AccountLayout>
  );
}
