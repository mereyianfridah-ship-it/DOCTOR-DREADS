import { Link } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { getMyBookings } from "../../api/endpoints";
import { ButtonLink } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { HoldCountdown } from "../../components/common/HoldCountdown";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { AccountLayout } from "../../components/layout/AccountLayout";
import { useAsync } from "../../hooks/useAsync";
import { formatLongDate } from "../../utils/format";
import { bookingStatusInfo } from "../../utils/status";

export default function AccountBookings() {
  const { data, loading, error, reload } = useAsync((s) => getMyBookings(s), []);
  return (
    <AccountLayout title="My bookings">
      <QueryState loading={loading} error={error} onRetry={reload}>
        {!data || data.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No bookings yet" action={<ButtonLink to="/booking">Book an Appointment</ButtonLink>} />
        ) : (
          <ul className="space-y-4">
            {data.map((b) => (
              <li key={b.reference}>
                <Link to={`/bookings/${b.reference}`} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-charcoal/10 bg-white p-6 transition hover:border-gold">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-wider text-charcoal/50">{b.reference}</p>
                    <h2 className="text-2xl">{b.service}</h2>
                    <p className="text-sm text-charcoal/70">{formatLongDate(b.date)} at {b.time} · {b.location === "salon" ? "Salon" : "Mobile"}</p>
                    {b.status === "pending_deposit" && <div className="mt-2"><HoldCountdown expiresAt={b.expiresAt} onExpire={reload} /></div>}
                  </div>
                  <StatusBadge {...bookingStatusInfo[b.status]} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
      <div className="mt-8"><ButtonLink to="/booking" variant="outline">New Booking</ButtonLink></div>
    </AccountLayout>
  );
}
