import { Package } from "lucide-react";
import { ButtonLink } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { AccountLayout } from "../../components/layout/AccountLayout";
import { demoOrders } from "../../data/account";
import { formatKSh, formatLongDate } from "../../utils/format";

export default function AccountOrders() {
  return (
    <AccountLayout title="My orders">
      {demoOrders.length === 0 ? (
        <EmptyState icon={<Package className="h-7 w-7" />} title="No orders yet" action={<ButtonLink to="/shop">Visit the Shop</ButtonLink>} />
      ) : (
        <ul className="space-y-4">
          {demoOrders.map((o) => (
            <li key={o.id} className="rounded-2xl border border-charcoal/10 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-charcoal/50">{o.id} · demo</p>
                  <p className="text-sm text-charcoal/70">{formatLongDate(o.date)}</p>
                </div>
                <span className="rounded-full bg-olive/15 px-3 py-1 text-xs font-semibold text-olive">{o.status}</span>
              </div>
              <p className="mt-3">{o.items}</p>
              <p className="mt-2 font-bold">{formatKSh(o.total)}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8"><ButtonLink to="/shop" variant="outline">Continue Shopping</ButtonLink></div>
    </AccountLayout>
  );
}
