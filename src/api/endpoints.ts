import { api } from "./client";

import type {
  AdminStylist,
  AdminSummary,
  BusinessPublic,
  BusinessSettings,
  AuthUser,
  BookingRecord,
  ConsultationNote,
  ConsultationRecord,
  QuotationResponse,
  PublicConsultation,
  ContactMessageRecord,
  GalleryItem,
  OrderRecord,
  PaymentRecord,
  ReviewRecord,
  ReviewStatus,
  Product,
  Service,
  SiteRules,
  Testimonial,
} from "../types";

// ---- public catalogue -------------------------------------------------------------------------

export const getConfig = (signal?: AbortSignal) =>
  api<SiteRules>("/config", { signal });

export const getServices = (signal?: AbortSignal) =>
  api<Service[]>("/services", { signal });

export const getProducts = (signal?: AbortSignal) =>
  api<Product[]>("/products", { signal });

export interface Category { name: string; slug: string }
export const getCategories = (signal?: AbortSignal) =>
  api<Category[]>("/categories", { signal });

export const getGallery = (signal?: AbortSignal) =>
  api<GalleryItem[]>("/gallery", { signal });

export type SiteImageMap = Record<string, { url: string; alt: string }>;
export const getSiteImages = (signal?: AbortSignal) =>
  api<SiteImageMap>("/site-images", { signal });

export const getTestimonials = (signal?: AbortSignal) =>
  api<Testimonial[]>("/testimonials", { signal });

export const submitReview = (b: {
  name: string;
  email: string;
  detail: string;
  rating: number;
  quote: string;
  website: string;
}) =>
  api<{ ok: true; message?: string }>("/testimonials", { method: "POST", body: b });


// ---- authentication ---------------------------------------------------------------------------

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const registerUser = (b: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  terms: true;
}) =>
  api<AuthResponse>("/auth/register", {
    method: "POST",
    body: b,
  });

export const loginUser = (b: {
  email: string;
  password: string;
}) =>
  api<AuthResponse>("/auth/login", {
    method: "POST",
    body: b,
  });

export const forgotPassword = (email: string) =>
  api<{ ok: true; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });

export const resetPassword = (token: string, password: string) =>
  api<{ ok: true }>("/auth/reset-password", {
    method: "POST",
    body: { token, password },
  });

export const getMe = (signal?: AbortSignal) =>
  api<{ user: AuthUser }>("/auth/me", { signal });

export const updateMe = (b: {
  fullName?: string;
  phone?: string;
}) =>
  api<{ user: AuthUser }>("/auth/me", {
    method: "PATCH",
    body: b,
  });

export const changePassword = (b: {
  currentPassword: string;
  newPassword: string;
}) =>
  api<{ ok: true }>("/auth/change-password", {
    method: "POST",
    body: b,
  });

export const requestPasswordReset = (email: string) =>
  api<{ ok: true }>("/auth/password-reset-request", {
    method: "POST",
    body: { email },
  });

export const verifyEmail = (token: string) =>
  api<{ ok: true }>("/auth/verify-email", {
    method: "POST",
    body: { token },
  });


// ---- availability and bookings ----------------------------------------------------------------

export interface AvailabilityResponse {
  date: string;
  open: boolean;
  closedReason?: string;
  /** The chosen stylist is off for the whole day. */
  stylistOff?: boolean;
  stylistOffReason?: string;
  /** Part-day closures (salon-wide and the chosen stylist's own) that explain unavailable times. */
  closedWindows?: ClosedWindow[];
  slots: {
    time: string;
    available: boolean;
  }[];
}

export interface ClosedWindow { from: string; to: string; reason: string }

/** A date that is closed (grey it out) or only partly closed (flag it) for the chosen stylist / "any". */
export interface ClosureDate {
  date: string;
  kind: "closed" | "partial";
  reason: string;
  windows?: ClosedWindow[];
}

export const getClosures = (from: string, to: string, stylist: string, signal?: AbortSignal) =>
  api<{ dates: ClosureDate[] }>(
    `/closures?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&stylist=${encodeURIComponent(stylist)}`,
    { signal },
  );

export const getAvailability = (
  date: string,
  stylist: string,
  signal?: AbortSignal
) =>
  api<AvailabilityResponse>(
    `/availability?date=${encodeURIComponent(date)}&stylist=${encodeURIComponent(stylist)}`,
    { signal }
  );

export const rescheduleBooking = (
  reference: string,
  b: { date: string; time: string; stylist?: string; email?: string }
) =>
  api<{ booking: BookingRecord; note?: string }>(
    `/bookings/${encodeURIComponent(reference)}/reschedule`,
    { method: "POST", body: b }
  );

export interface BookingInput {
  serviceSlug: string;
  location: "salon" | "mobile";
  date: string;
  time: string;
  stylist: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
}

export const createBooking = (b: BookingInput) =>
  api<{
    booking: BookingRecord;
    payment: { amount: number };
  }>("/bookings", {
    method: "POST",
    body: b,
  });

export const getBooking = (
  reference: string,
  email?: string,
  signal?: AbortSignal
) =>
  api<{ booking: BookingRecord }>(
    `/bookings/${encodeURIComponent(reference)}${
      email ? `?email=${encodeURIComponent(email)}` : ""
    }`,
    { signal }
  );

export const cancelBooking = (
  reference: string,
  email?: string
) =>
  api<{ booking: BookingRecord; note?: string }>(
    `/bookings/${encodeURIComponent(reference)}/cancel`,
    {
      method: "POST",
      body: { email },
    }
  );


// ---- orders -----------------------------------------------------------------------------------

export interface OrderInput {
  name: string;
  phone: string;
  email: string;
  method: "delivery" | "collection";
  area?: string;
  address?: string;
  payment: "mpesa" | "card";
  items: {
    productId: string;
    quantity: number;
  }[];
}

export const createOrder = (b: OrderInput) =>
  api<{
    order: OrderRecord;
    payment: { amount: number };
  }>("/orders", {
    method: "POST",
    body: b,
  });

export const getOrder = (
  reference: string,
  email?: string,
  signal?: AbortSignal
) =>
  api<{ order: OrderRecord }>(
    `/orders/${encodeURIComponent(reference)}${
      email ? `?email=${encodeURIComponent(email)}` : ""
    }`,
    { signal }
  );

export const cancelOrder = (
  reference: string,
  email?: string
) =>
  api<{ order: OrderRecord }>(
    `/orders/${encodeURIComponent(reference)}/cancel`,
    {
      method: "POST",
      body: { email },
    }
  );


// ---- consultations and contact ----------------------------------------------------------------

export const submitConsultation = (form: FormData) =>
  api<{
    consultation: {
      reference: string;
      status: string;
      photos: number;
    };
    message: string;
  }>("/consultations", {
    method: "POST",
    form,
  });

/** Customer status view. `contact` is the email or phone number given on the request (not needed when signed in as the owner). */
export const getConsultation = (
  reference: string,
  contact?: string,
  signal?: AbortSignal
) =>
  api<{ consultation: PublicConsultation }>(
    `/consultations/${encodeURIComponent(reference)}${
      contact ? `?contact=${encodeURIComponent(contact)}` : ""
    }`,
    { signal }
  );

export const respondToQuotation = (
  reference: string,
  response: QuotationResponse,
  contact?: string
) =>
  api<{ consultation: PublicConsultation }>(
    `/consultations/${encodeURIComponent(reference)}/quotation-response`,
    { method: "POST", body: { response, contact } }
  );

export const sendContact = (b: {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  website: string;
}) =>
  api<{ ok: true; message?: string }>("/contact", {
    method: "POST",
    body: b,
  });


// ---- customer account -------------------------------------------------------------------------

export const getMyBookings = (signal?: AbortSignal) =>
  api<BookingRecord[]>("/account/bookings", { signal });

export const getMyOrders = (signal?: AbortSignal) =>
  api<OrderRecord[]>("/account/orders", { signal });


// ---- admin ------------------------------------------------------------------------------------

const qs = (
  params: Record<string, string | number | undefined>
): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};


export const adminSummary = (signal?: AbortSignal) =>
  api<AdminSummary>("/admin/summary", { signal });


export const adminBookings = (
  p: {
    status?: string;
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
) =>
  api<BookingRecord[]>(`/admin/bookings${qs(p)}`, { signal });

export const adminMarkRefunded = (reference: string) =>
  api<{ ok: true }>(`/admin/bookings/${encodeURIComponent(reference)}/refund`, { method: "POST", body: {} });

export const adminSetBookingStatus = (
  reference: string,
  status: "confirmed" | "completed" | "cancelled"
) =>
  api<{ ok: true }>(
    `/admin/bookings/${encodeURIComponent(reference)}`,
    {
      method: "PATCH",
      body: { status },
    }
  );


export const adminOrders = (
  p: {
    status?: string;
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
) =>
  api<OrderRecord[]>(`/admin/orders${qs(p)}`, { signal });

export const adminSetOrderStatus = (
  reference: string,
  status: "processing" | "shipped" | "delivered" | "cancelled"
) =>
  api<{ ok: true }>(
    `/admin/orders/${encodeURIComponent(reference)}`,
    {
      method: "PATCH",
      body: { status },
    }
  );


export const adminConsultations = (
  p: {
    status?: string;
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
) =>
  api<ConsultationRecord[]>(`/admin/consultations${qs(p)}`, { signal });

export const adminSetConsultationStatus = (
  reference: string,
  status: "new" | "contacted" | "quoted" | "closed"
) =>
  api<{ ok: true }>(
    `/admin/consultations/${encodeURIComponent(reference)}`,
    {
      method: "PATCH",
      body: { status },
    }
  );


export const adminConsultationNotes = (reference: string, signal?: AbortSignal) =>
  api<ConsultationNote[]>(
    `/admin/consultations/${encodeURIComponent(reference)}/notes`,
    { signal }
  );

export const adminAddConsultationNote = (reference: string, body: string) =>
  api<ConsultationNote>(
    `/admin/consultations/${encodeURIComponent(reference)}/notes`,
    { method: "POST", body: { body } }
  );

export const adminDeleteConsultationNote = (reference: string, id: number) =>
  api<{ ok: true }>(
    `/admin/consultations/${encodeURIComponent(reference)}/notes/${id}`,
    { method: "DELETE" }
  );

export const adminGenerateQuotation = (
  reference: string,
  quotationAmount: number,
  quotationNote?: string
) =>
  api<{ ok: true }>(
    `/admin/consultations/${encodeURIComponent(reference)}/quotation`,
    {
      method: "PATCH",
      body: {
        quotationAmount,
        quotationNote,
      },
    }
  );


export const adminMessages = (
  p: {
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
) =>
  api<ContactMessageRecord[]>(`/admin/messages${qs(p)}`, { signal });

export const adminSetMessageHandled = (
  id: number,
  handled: boolean
) =>
  api<{ ok: true }>(`/admin/messages/${id}`, {
    method: "PATCH",
    body: { handled },
  });


export const adminReviews = (
  p: { status?: ReviewStatus; limit?: number; offset?: number },
  signal?: AbortSignal
) =>
  api<ReviewRecord[]>(`/admin/testimonials${qs(p)}`, { signal });

export const adminSetReviewStatus = (id: string, status: ReviewStatus) =>
  api<{ ok: true }>(`/admin/testimonials/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { status },
  });

export const adminDeleteReview = (id: string) =>
  api<{ ok: true }>(`/admin/testimonials/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

/** Replace the photo in a site slot (hero, welcome photos, about, booking banner). */
export const adminSetSiteImage = (slot: string, file: File, alt = "") => {
  const form = new FormData();
  form.append("file", file);
  form.append("alt", alt);
  return api<{ slot: string; url: string; alt: string }>(`/uploads/site-images/${encodeURIComponent(slot)}`, { method: "PUT", form });
};

export const adminResetSiteImage = (slot: string) =>
  api<{ ok: true }>(`/uploads/site-images/${encodeURIComponent(slot)}`, { method: "DELETE" });

export const adminSetServiceImage = (slug: string, file: File) => {
  const form = new FormData();
  form.append("file", file);
  return api<{ slug: string; image: string }>(`/uploads/services/${encodeURIComponent(slug)}`, { method: "PUT", form });
};

export const adminUploadGalleryPhoto = (file: File, title: string, category: string) => {
  const form = new FormData();
  form.append("file", file);
  form.append("title", title);
  form.append("category", category);
  return api<GalleryItem>("/uploads/gallery", { method: "POST", form });
};

export const adminDeleteGalleryPhoto = (id: string) =>
  api<{ ok: true }>(`/uploads/gallery/${encodeURIComponent(id)}`, { method: "DELETE" });

export const adminCreateCancellationRequest = (
  reference: string,
  reason: string
) =>
  api<{ ok: true }>(
    `/admin/bookings/${encodeURIComponent(reference)}/cancellation-request`,
    {
      method: "POST",
      body: { reason },
    }
  );


export const adminGetCancellationRequest = (
  reference: string,
  signal?: AbortSignal
) =>
  api<{
    status: string;
    reason?: string;
    created_at: string;
  }>(
    `/admin/bookings/${encodeURIComponent(reference)}/cancellation-request`,
    { signal }
  );


export const adminPayments = (
  p: {
    limit?: number;
    offset?: number;
  },
  signal?: AbortSignal
) =>
  api<PaymentRecord[]>(`/admin/payments${qs(p)}`, { signal });


// Admin product updates

export const adminCreateProduct = (b: {
  name: string;
  slug?: string;
  category: string;
  shortDescription?: string;
  description?: string;
  price: number;
  stock: number;
  size?: string;
  status: "draft" | "active" | "archived";
  low_stock_threshold: number;
  images?: string[];
}) =>
  api<{ ok: true; product: Product }>(
    `/admin/products`,
    {
      method: "POST",
      body: b,
    }
  );

export const adminProducts = (
  p: { status?: string; q?: string; limit?: number; offset?: number } = {},
  signal?: AbortSignal
) => api<Product[]>(`/admin/products${qs({ limit: 200, ...p })}`, { signal });

/** Uploads one photo. The server appends it and drops bundled sample images. */
export const adminProductImages = (formData: FormData) => {
  const slug = formData.get("product_slug");
  if (!slug) throw new Error("product_slug is required");
  return api<{ url: string; images: string[] }>(
    `/uploads/products/${encodeURIComponent(String(slug))}`,
    { method: "POST", form: formData }
  );
};

export const adminDeleteProductImage = (slug: string, imageUrl: string) =>
  api<{ ok: true; images: string[] }>(`/uploads/products/${encodeURIComponent(slug)}`, {
    method: "DELETE",
    body: { imageUrl },
  });

/** The first image in the list is the primary photo shown on cards. */
export const adminReorderProductImages = (slug: string, images: string[]) =>
  api<{ ok: true; images: string[] }>(`/uploads/products/${encodeURIComponent(slug)}/order`, {
    method: "PUT",
    body: { images },
  });

export const adminUpdateProduct = (
  slug: string,
  b: {
    name?: string;
    shortDescription?: string;
    description?: string;
    category?: string;
    size?: string;
    featured?: boolean;
    price?: number;
    stock?: number;
    status?: "draft" | "active" | "archived";
    low_stock_threshold?: number;
  }
) =>
  api<{ ok: true }>(`/admin/products/${encodeURIComponent(slug)}`, { method: "PATCH", body: b });


// Admin service updates

export const adminUpdateService = (
  slug: string,
  b: {
    priceFrom: number | null;
  }
) =>
  api<{ ok: true }>(
    `/admin/services/${encodeURIComponent(slug)}`,
    {
      method: "PATCH",
      body: b,
    }
  );


// ---- admin: customers directory ---------------------------------------------------------------

export interface AdminCustomer {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  bookings: number;
  orders: number;
  spent: number;
}

export const adminCustomers = (
  p: { q?: string; limit?: number; offset?: number },
  signal?: AbortSignal
) => api<AdminCustomer[]>(`/admin/customers${qs(p)}`, { signal });


// ---- admin: TikTok videos ---------------------------------------------------------------------

export interface AdminTiktokVideo {
  id: number;
  url: string;
  videoId: string;
  title: string;
  published: boolean;
  sortOrder: number;
  createdAt: string;
}

const toTiktok = (r: Record<string, any>): AdminTiktokVideo => ({
  id: Number(r.id),
  url: String(r.url ?? ""),
  videoId: String(r.videoId ?? r.videoid ?? ""),
  title: String(r.title ?? ""),
  published: r.published === true || r.published === 1,
  sortOrder: Number(r.sortOrder ?? r.sortorder ?? 0),
  createdAt: String(r.createdAt ?? r.createdat ?? ""),
});

export const adminTiktokVideos = async (signal?: AbortSignal) =>
  (await api<Record<string, any>[]>("/admin/tiktok", { signal })).map(toTiktok);

export const adminAddTiktok = (b: { url: string; title: string }) =>
  api<{ id: number }>("/admin/tiktok", { method: "POST", body: b });

export const adminUpdateTiktok = (
  id: number,
  b: { url?: string; title?: string; published?: boolean; sortOrder?: number }
) => api<{ ok: true }>(`/admin/tiktok/${id}`, { method: "PATCH", body: b });

export const adminDeleteTiktok = (id: number) =>
  api<{ ok: true }>(`/admin/tiktok/${id}`, { method: "DELETE" });
// ---- business details and stylists --------------------------------------------------------------

export const getBusiness = (signal?: AbortSignal) => api<BusinessPublic>("/business", { signal });

export const adminBusiness = (signal?: AbortSignal) => api<BusinessSettings>("/admin/business", { signal });

export const adminSaveBusiness = (b: BusinessSettings) =>
  api<BusinessSettings>("/admin/business", { method: "PUT", body: b });

export const adminStylists = (signal?: AbortSignal) =>
  api<{ managed: boolean; stylists: AdminStylist[] }>("/admin/stylists", { signal });

export const adminAddStylist = (b: { name: string; note: string }) =>
  api<AdminStylist>("/admin/stylists", { method: "POST", body: b });

export const adminUpdateStylist = (id: string, b: { name?: string; note?: string; active?: boolean }) =>
  api<{ ok: true; upcomingBookings?: number }>(`/admin/stylists/${encodeURIComponent(id)}`, { method: "PATCH", body: b });

export const adminDeleteStylist = (id: string) =>
  api<{ ok: true }>(`/admin/stylists/${encodeURIComponent(id)}`, { method: "DELETE" });

export type ClosureRecurrence = "once" | "weekly" | "yearly";
export interface AdminClosure {
  id: number;
  stylistId: string | null;
  stylistName: string | null;
  recurrence: ClosureRecurrence;
  startDate: string | null;
  endDate: string | null;
  weekday: number | null;
  monthDay: string | null;
  startTime: string | null;
  endTime: string | null;
  reason: string;
  summary: string;
  affectedBookings: number;
}
export interface ClosureInput {
  stylistId?: string;
  recurrence: ClosureRecurrence;
  startDate?: string;
  endDate?: string;
  weekday?: number;
  monthDay?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
}
export const adminClosures = (signal?: AbortSignal) => api<AdminClosure[]>("/admin/closures", { signal });
export const adminAddClosure = (b: ClosureInput) => api<AdminClosure>("/admin/closures", { method: "POST", body: b });
export const adminDeleteClosure = (id: number) => api<{ ok: true }>(`/admin/closures/${id}`, { method: "DELETE" });

export interface ClosedDay { date: string; reason: string; affectedBookings: number }
export const adminClosedDays = (signal?: AbortSignal) => api<ClosedDay[]>("/admin/closed-days", { signal });
export const adminCloseDay = (b: { date: string; reason: string }) => api<ClosedDay>("/admin/closed-days", { method: "POST", body: b });
export const adminReopenDay = (date: string) => api<{ ok: true }>(`/admin/closed-days/${encodeURIComponent(date)}`, { method: "DELETE" });
