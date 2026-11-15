import { NavLink, Outlet } from "react-router-dom";
import { BarChart3, Boxes, CalendarDays, CalendarOff, CreditCard, Inbox, LayoutDashboard, MessageSquare, Image as ImageIcon, Package, Star, Scissors, Settings, ShoppingBag, Tag, UserRound, Users, Video } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const items = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarDays, end: false },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, end: false },
  { to: "/admin/consultations", label: "Consultations", icon: Inbox, end: false },
  { to: "/admin/messages", label: "Messages", icon: MessageSquare, end: false },
  { to: "/admin/reviews", label: "Reviews", icon: Star, end: false },
  { to: "/admin/payments", label: "Payments", icon: CreditCard, end: false },
  { to: "/admin/images", label: "Images", icon: ImageIcon, end: false },
  { to: "/admin/products", label: "Products", icon: Package, end: false },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes, end: false },
  { to: "/admin/reports", label: "Reports", icon: BarChart3, end: false },
  { to: "/admin/services", label: "Services", icon: Scissors, end: false },
  { to: "/admin/closed-days", label: "Closed days", icon: CalendarOff, end: false },
  { to: "/admin/stylists", label: "Stylists", icon: UserRound, end: false },
  { to: "/admin/customers", label: "Customers", icon: Users, end: false },
  { to: "/admin/tiktok", label: "TikTok", icon: Video, end: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, end: false },
];

export function AdminLayout() {
  const { user } = useAuth();
  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-brown">
        <Tag className="h-4 w-4" aria-hidden /> Admin · {user?.fullName}
      </div>
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Admin" className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {items.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium lg:rounded-xl ${isActive ? "bg-charcoal text-offwhite" : "bg-white text-charcoal hover:bg-cream"}`
              }
            >
              <Icon className="h-4 w-4" aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0"><Outlet /></div>
      </div>
    </div>
  );
}
