import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Menu, ShoppingBag, User, X } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { ButtonLink } from "../common/Button";
import { BrandMark } from "./BrandMark";

export const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/shop", label: "Shop" },
  { to: "/gallery", label: "Gallery" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { itemCount, openDrawer } = useCart();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `relative py-1 text-sm font-medium transition hover:text-brown after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:bg-gold after:transition-all ${
      isActive ? "text-brown after:w-full" : "text-charcoal after:w-0 hover:after:w-full"
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-charcoal/10 bg-offwhite">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <BrandMark />

        <nav aria-label="Main navigation" className="hidden items-center gap-8 lg:flex">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"} className={linkClass}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ButtonLink to="/booking" size="sm" className="hidden sm:inline-flex">
            Book Appointment
          </ButtonLink>
          <button
            type="button"
            onClick={openDrawer}
            aria-label={`Open cart, ${itemCount} items`}
            className="relative rounded-full p-2.5 hover:bg-charcoal/5"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-[11px] font-bold text-charcoal">
                {itemCount}
              </span>
            )}
          </button>
          <Link to="/account" aria-label="My account" className="rounded-full p-2.5 hover:bg-charcoal/5">
            <User className="h-5 w-5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-full p-2.5 hover:bg-charcoal/5 lg:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 top-20 z-40 h-[calc(100dvh-5rem)] animate-fade-in overflow-y-auto bg-offwhite lg:hidden">
          <nav aria-label="Mobile navigation" className="container-page flex flex-col py-6">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                className={({ isActive }) =>
                  `border-b border-charcoal/10 py-4 font-display text-2xl ${isActive ? "text-brown" : "text-charcoal"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
            <ButtonLink to="/booking" size="lg" fullWidth className="mt-8">
              Book Appointment
            </ButtonLink>
            <ButtonLink to="/account" variant="outline" size="lg" fullWidth className="mt-3">
              My Account
            </ButtonLink>
          </nav>
        </div>
      )}
    </header>
  );
}
