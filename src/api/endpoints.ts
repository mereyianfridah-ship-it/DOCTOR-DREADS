import { api } from "./client";
import type {
  AdminSummary, AuthUser, BookingRecord, ConsultationRecord, ContactMessageRecord, GalleryItem, OrderRecord,
  PaymentRecord, Product, Service, SiteRules, Testimonial,
} from "../types";

// ---- public catalogue -------------------------------------------------------------------------
export const getConfig = (signal?: AbortSignal) => api<SiteRules>("/config", { signal });
export const getServices = (signal?: AbortSignal) => api<Service[]>("/services", { signal });
export const getProducts = (signal?: AbortSignal) => api<Product[]>("/products", { signal });
export const getGallery = (signal?: AbortSignal) => api<GalleryItem[]>("/gallery", { signal });
export const getTestimonials = (signal?: AbortSignal) => api<Testimonial[]>("/testimonials", { signal });

// ---- auth -------------------------------------------------------------------------------------
export interface AuthResponse { token: string; user: AuthUser }
export const registerUser = (b: { fullName: string; email: string; phone: string; password: string; terms: true }) =>
  api<AuthResponse>("/auth/register", { method: "POST", body: b });
export const loginUser = (b: { email: string; password: string }) => api<AuthResponse>("/auth/login", { method: "POST", body: b });
export const getMe = (signal?: AbortSignal) => api<{ user: AuthUser }>("/auth/me", { signal });
export const updateMe = (b: { fullName?: string; phone?: string }) => api<{ user: AuthUser }>("/auth/me", { method: "PATCH", body: b });
export const changePassword = (b: { currentPassword: string; newPassword: string }) =>
  api<{ ok: true }>("/auth/change-password", { method: "POST", body: b });

// NEW: Password reset request
export const requestPasswordReset = (email: string) =>
  api<{ ok: true }>("/auth/password-reset-request", { method: "POST", body: { email } });

// NEW: Email verification
export const verifyEmail = (token: string) => api<{ ok: true }>("/auth/verify-email", { method: "POST", body: { token } });

// ---- availability and bookings ----------------------------------------------------------------
export interface AvailabilityResponse { date: string; open: boolean; slots: { time: string; available: boolean }[] }
export const getAvailability = (date: string, stylist: string, signal?: AbortSignal) =>
  api<AvailabilityResponse>(`/availability?date=${encodeURIComponent(date)}&stylist=${encodeURIComponent(stylist)}`, { signal });

export interface BookingInput {
  serviceSlug: string; location: "salon" | "mobile"; date: string; time: string; stylist: string;
  fullName: string; phone: string; email: string; notes: string;
}
export const createBooking = (b: BookingInput) =>
  api<{ booking: BookingRecord; payment: { amount: number } }>("/bookings", { method: "POST", body: b });
export const getBooking = (reference: string, email?: string, signal?: AbortSignal) =>
  api<{ booking: BookingRecord }>(`/bookings/${encodeURIComponent(reference)}${email ? `?email=${encodeURIComponent(email)}` : ""}`, { signal });
export const cancelBooking = (reference: string, email?: string) =>
  api<{ booking: BookingRecord; note?: string }>(`/bookings/${encodeURIComponent(reference)}/cancel`, { method: "POST", body: { email } });

// ---- orders -----------------------------------------------------------------------------------
export interface OrderInput {
  name: string; phone: string; email: string; method: "delivery" | "collection"; area?: string; address?: string;
  payment: "mpesa" | "card"; items: { productId: string; quantity: number }[];
}
export const createOrder = (b: OrderInput) => api<{ order: OrderRecord; payment: { amount: number } }>("/orders", { method: "POST", body: b });
export const getOrder = (reference: string, email?: string, signal?: AbortSignal) =>
  api<{ order: OrderRecord }>(`/orders/${encodeURIComponent(reference)}${email ? `?email=${encodeURIComponent(email)}` : ""}`, { signal });
export const cancelOrder = (reference: string, email?: string) =>
  api<{ order: OrderRecord }>(`/orders/${encodeURIComponent(reference)}/cancel`, { method: "POST", body: { email } });

// ---- consultations and contact ----------------------------------------------------------------
export const submitConsultation = (form: FormData) =>
  api<{ consultation: { reference: string; status: string; photos: number }; message: string }>("/consultations", { method: "POST", form });
export const sendContact = (b: { name: string; email: string; phone: string; subject: string; message: string; website: string }) =>
  api<{ ok: true; message?: string }>("/contact", { method: "POST", body: b });

// ---- customer account -------------------------------------------------------------------------
export const getMyBookings = (signal?: AbortSignal) => api<BookingRecord[]>("/account/bookings", { signal });
export const getMyOrders = (signal?: AbortSignal) => api<OrderRecord[]>("/account/orders", { signal });

// ---- admin ------------------------------------------------------------------------------------
const qs = (p: Record<string, string | number | undefined>) => {
  const s = Object.entries(p).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
  return s ? `?${s}` : "";
};
export const adminSummary = (signal?: AbortSignal) => api<AdminSummary>("/admin/summary", { signal });
export const adminBookings = (p: { status?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
  api<BookingRecord[]>(`/admin/bookings${qs(p)}`, { signal });
export const adminSetBookingStatus = (reference: string, status: "confirmed" | "completed" | "cancelled") =>
  api<{ ok: true }>(`/admin/bookings/${encodeURIComponent(reference)}`, { method: "PATCH", body: { status } });
export const adminOrders = (p: { status?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
  api<OrderRecord[]>(`/admin/orders${qs(p)}`, { signal });
export const adminSetOrderStatus = (reference: string, status: "processing" | "shipped" | "delivered" | "cancelled") =>
  api<{ ok: true }>(`/admin/orders/${encodeURIComponent(reference)}`, { method: "PATCH", body: { status } });
export const adminConsultations = (p: { status?: string; limit?: number; offset?: number }, signal?: AbortSignal) =>
  api<ConsultationRecord[]>(`/admin/consultations${qs(p)}`, { signal });
export const adminSetConsultationStatus = (reference: string, status: "new" | "contacted" | "quoted" | "closed") =>
  api<{ ok: true }>(`/admin/consultations/${encodeURIComponent(reference)}`, { method: "PATCH", body: { status } });
export const adminGenerateQuotation = (reference: string, quotationAmount: number, quotationNote?: string) =>
  api<{ ok: true }>("/admin/consultations/" + reference + "/quotation", { method: "PATCH", body: { quotationAmount, quotationNote } });
export const adminMessages = (p: { limit?: number; offset?: number }, signal?: AbortSignal) =>
  api<ContactMessageRecord[]>(`/admin/messages${qs(p)}`, { signal });
export const adminSetMessageHandled = (id: number, handled: boolean) =>
  api<{ ok: true }>(`/admin/messages/${id}`, { method: "PATCH", body: { handled } });
// NEW: Admin cancellation request creation
export const adminCreateCancellationRequest = (reference: string, reason: string) =>
  api<{ ok: true }>(`/admin/bookings/${encodeURIComponent(reference)}/cancellation-request`, { method: "POST", body: { reason } });

// NEW: Admin cancellation request status
export const adminGetCancellationRequest = (reference: string) =>
  api<{ status: string; reason?: string; created_at: string }>(`/admin/bookings/${encodeURIComponent(reference)}/cancellation-request`, { signal?: AbortSignal });
// NEW: Admin payments
export const adminPayments = (p: { limit?: number; offset?: number }, signal?: AbortSignal) =>
  api<PaymentRecord[]>(`/admin/payments${qs(p)}`, { signal });
export const adminUpdateProduct = (slug: string, b: { price?: number; stock?: number }) =>
  api<{ ok: true }>(`/admin/products/${encodeURIComponent(slug)}`, { method: "PATCH", body: b });
export const adminUpdateService = (slug: string, b: { priceFrom: number | null }) =>
  api<{ ok: true }>(`/admin/services/${encodeURIComponent(slug)}`, { method: "PATCH", body: b });
