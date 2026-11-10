import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CartDrawer } from "../shop/CartDrawer";
import { ToastNotification } from "../common/ToastNotification";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);
  return null;
}

export function Layout() {
  const { pathname } = useLocation();
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-gold focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main" key={pathname} className="flex-1 animate-fade-in">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <ToastNotification />
    </div>
  );
}
