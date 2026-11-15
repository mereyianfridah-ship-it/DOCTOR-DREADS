export const SITE_NAME = "Dr Dread Kenya";
export const DEFAULT_TITLE = `${SITE_NAME} | Dreadlocks & Natural Hair Care in Rongai`;

const TITLES: Record<string, string> = {
  "/about": "About us",
  "/services": "Dreadlocks services",
  "/booking": "Book an appointment",
  "/consultation": "Free consultation",
  "/shop": "Shop hair-care essentials",
  "/cart": "Your cart",
  "/wishlist": "Your wishlist",
  "/checkout": "Checkout",
  "/track": "Track a booking or order",
  "/gallery": "Gallery",
  "/contact": "Contact us",
  "/login": "Sign in",
  "/register": "Create an account",
  "/forgot-password": "Forgot password",
  "/reset-password": "Reset password",
  "/account": "My account",
  "/account/bookings": "My bookings",
  "/account/orders": "My orders",
  "/privacy": "Privacy policy",
  "/terms": "Terms of service",
};

/** Pages that should not appear in search results. */
const PRIVATE_PREFIXES = ["/admin", "/account", "/checkout", "/cart", "/bookings/", "/consultations/", "/orders/", "/track", "/reset-password", "/login", "/register", "/forgot-password"];

const normalise = (pathname: string) => (pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname);

export const isPrivatePath = (pathname: string) => PRIVATE_PREFIXES.some((p) => normalise(pathname).startsWith(p.replace(/\/$/, "")));

/**
 * Title for a static route, or null when the page sets its own (home, product,
 * service, admin pages) or the path is unknown.
 */
export function titleForPath(pathname: string): string | null {
  const t = TITLES[normalise(pathname)];
  return t ? `${t} | ${SITE_NAME}` : null;
}
