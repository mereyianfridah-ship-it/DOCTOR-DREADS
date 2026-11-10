import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Link } from "react-router-dom";
import { CalendarDays, LogOut, Package, UserRound } from "lucide-react";
import { DemoNotice } from "../common/DemoNotice";
import { PageHeader } from "../common/PageHeader";

const items = [
  { to: "/account", label: "Profile", icon: UserRound, end: true },
  { to: "/account/bookings", label: "Bookings", icon: CalendarDays, end: false },
  { to: "/account/orders", label: "Orders", icon: Package, end: false },
];

export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="My account" title={title} />
      <section className="section">
        <div className="container-page">
          <DemoNotice className="mb-8">
            <strong>Demo account view.</strong> Everything shown is sample data. Real accounts will be powered by Supabase Auth.
          </DemoNotice>
          <div className="grid gap-8 md:grid-cols-[220px_1fr]">
            <nav aria-label="Account" className="flex gap-2 overflow-x-auto md:flex-col">
              {items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium md:rounded-xl ${isActive ? "bg-charcoal text-offwhite" : "bg-white text-charcoal hover:bg-cream"}`
                  }
                >
                  <Icon className="h-4 w-4" aria-hidden /> {label}
                </NavLink>
              ))}
              <Link to="/login" className="flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium text-charcoal/70 hover:bg-cream md:rounded-xl">
                <LogOut className="h-4 w-4" aria-hidden /> Sign out
              </Link>
            </nav>
            <div>{children}</div>
          </div>
        </div>
      </section>
    </>
  );
}
