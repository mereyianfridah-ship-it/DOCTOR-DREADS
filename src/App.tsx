import { Suspense, lazy } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CatalogProvider } from "./context/CatalogContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { Layout } from "./components/layout/Layout";
import { LoadingSpinner } from "./components/common/LoadingSpinner";
import { RequireAdmin, RequireAuth } from "./components/common/RequireAuth";
import Home from "./pages/Home";
import About from "./pages/About";
import Services from "./pages/Services";
import ServiceDetails from "./pages/ServiceDetails";
import Booking from "./pages/Booking";
import BookingStatus from "./pages/BookingStatus";
import Consultation from "./pages/Consultation";
import ConsultationStatus from "./pages/ConsultationStatus";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import OrderStatus from "./pages/OrderStatus";
import Track from "./pages/Track";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Account from "./pages/Account";
import AccountBookings from "./pages/account/AccountBookings";
import AccountOrders from "./pages/account/AccountOrders";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";

// The admin app is only downloaded by people who open /admin.
const AdminLayout = lazy(() => import("./components/layout/AdminLayout").then((m) => ({ default: m.AdminLayout })));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminBookings = lazy(() => import("./pages/admin/AdminBookings"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminConsultations = lazy(() => import("./pages/admin/AdminConsultations"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminImages = lazy(() => import("./pages/admin/AdminImages"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminTiktok = lazy(() => import("./pages/admin/AdminTiktok"));
const AdminStylists = lazy(() => import("./pages/admin/AdminStylists"));
const AdminClosedDays = lazy(() => import("./pages/admin/AdminClosedDays"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

const lazyPage = (node: ReactNode) => <Suspense fallback={<LoadingSpinner />}>{node}</Suspense>;

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <AuthProvider>
        <CatalogProvider>
          <CartProvider>
            <WishlistProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="about" element={<About />} />
                <Route path="services" element={<Services />} />
                <Route path="services/:slug" element={<ServiceDetails />} />
                <Route path="booking" element={<Booking />} />
                <Route path="bookings/:reference" element={<BookingStatus />} />
                <Route path="consultation" element={<Consultation />} />
                <Route path="consultations/:reference" element={<ConsultationStatus />} />
                <Route path="shop" element={<Shop />} />
                <Route path="shop/:slug" element={<ProductDetails />} />
                <Route path="cart" element={<Cart />} />
                <Route path="wishlist" element={<Wishlist />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="orders/:reference" element={<OrderStatus />} />
                <Route path="track" element={<Track />} />
                <Route path="gallery" element={<Gallery />} />
                <Route path="contact" element={<Contact />} />
                <Route path="login" element={<Login />} />
                <Route path="register" element={<Register />} />
                <Route path="forgot-password" element={<ForgotPassword />} />
                <Route path="reset-password" element={<ResetPassword />} />
                <Route path="account" element={<RequireAuth><Account /></RequireAuth>} />
                <Route path="account/bookings" element={<RequireAuth><AccountBookings /></RequireAuth>} />
                <Route path="account/orders" element={<RequireAuth><AccountOrders /></RequireAuth>} />
                <Route path="admin" element={<RequireAdmin>{lazyPage(<AdminLayout />)}</RequireAdmin>}>
                  <Route index element={lazyPage(<AdminOverview />)} />
                  <Route path="bookings" element={lazyPage(<AdminBookings />)} />
                  <Route path="orders" element={lazyPage(<AdminOrders />)} />
                  <Route path="consultations" element={lazyPage(<AdminConsultations />)} />
                  <Route path="messages" element={lazyPage(<AdminMessages />)} />
                  <Route path="reviews" element={lazyPage(<AdminReviews />)} />
                  <Route path="images" element={lazyPage(<AdminImages />)} />
                  <Route path="payments" element={lazyPage(<AdminPayments />)} />
                  <Route path="products" element={lazyPage(<AdminProducts />)} />
                  <Route path="services" element={lazyPage(<AdminServices />)} />
                  <Route path="customers" element={lazyPage(<AdminCustomers />)} />
                  <Route path="tiktok" element={lazyPage(<AdminTiktok />)} />
                  <Route path="stylists" element={lazyPage(<AdminStylists />)} />
                  <Route path="closed-days" element={lazyPage(<AdminClosedDays />)} />
                  <Route path="settings" element={lazyPage(<AdminSettings />)} />
                </Route>
                <Route path="privacy" element={<Legal kind="privacy" />} />
                <Route path="terms" element={<Legal kind="terms" />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            </WishlistProvider>
          </CartProvider>
        </CatalogProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
