import { CalendarDays } from "lucide-react";
import { ButtonLink } from "../../components/common/Button";
import { EmptyState } from "../../components/common/EmptyState";
import { AccountLayout } from "../../components/layout/AccountLayout";
import { demoBookings } from "../../data/account";
import { formatLongDate } from "../../utils/format";

export default function AccountBookings() {
  return (
    <AccountLayout title="My bookings">
      {demoBookings.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No bookings yet" action={<ButtonLink to="/booking">Book an Appointment</ButtonLink>} />
      ) : (
        <ul className="space-y-4">
          {demoBookings.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-charcoal/10 bg-white p-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-charcoal/50">{b.id} · demo</p>
                <h2 className="text-2xl">{b.service}</h2>
                <p className="text-sm text-charcoal/70">{formatLongDate(b.date)} at {b.time} · {b.location}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.status === "Upcoming" ? "bg-gold/25 text-brown" : "bg-olive/15 text-olive"}`}>{b.status}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8"><ButtonLink to="/booking" variant="outline">New Booking</ButtonLink></div>
    </AccountLayout>
  );
}
