export type BookingType = "instant" | "consultation";

export interface Service {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  benefits: string[];
  image: string;
  duration: string;
  /** Integer KSh. null => "Request a Quote". */
  priceFrom: number | null;
  bookingType: BookingType;
  featured?: boolean;
}

export interface Product {
  slug: string;
  name: string;
  category: string;
  shortDescription: string;
  description: string;
  /** Integer KSh */
  price: number;
  stock: number;
  images: string[];
  size: string;
  featured?: boolean;
}

export interface Testimonial {
  id: string;
  name: string;
  detail: string;
  quote: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  image: string;
  afterImage?: string;
  isVideo?: boolean;
}

export interface CartLine {
  productId: string; // product slug
  quantity: number;
}

/** Business rules served by GET /api/config. */
export interface SiteRules {
  booking: {
    openDays: number[];
    slots: string[];
    advanceDays: number;
    depositPercent: number;
    inPersonConsultationFee: number | null;
    onlineConsultationFree: boolean;
  };
  checkout: {
    deliveryAreas: { id: string; label: string; fee: number }[];
    collectionLabel?: string;
  };
  stylists: { id: string; name: string; note: string }[];
}

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: "customer" | "admin";
}

export type BookingStatus = "pending_deposit" | "confirmed" | "completed" | "cancelled" | "expired";
export interface BookingRecord {
  reference: string;
  service?: string;
  serviceSlug: string;
  location: "salon" | "mobile";
  date: string;
  time: string;
  stylistId: string;
  fullName: string;
  phone: string;
  email: string;
  notes: string;
  depositAmount: number;
  status: BookingStatus;
  expiresAt: string | null;
  createdAt: string;
}

export type OrderStatus = "pending_payment" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "expired";
export interface OrderRecord {
  reference: string;
  name: string;
  phone: string;
  email: string;
  method: "delivery" | "collection";
  area: string | null;
  address: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: "mpesa" | "card";
  status: OrderStatus;
  expiresAt: string | null;
  createdAt: string;
  items: { productId: string; name: string; unitPrice: number; quantity: number }[];
}

export type ConsultationStatus = "new" | "contacted" | "quoted" | "closed";
export interface ConsultationRecord {
  reference: string;
  fullName: string;
  phone: string;
  email: string;
  condition: string;
  length: string;
  locSize: string;
  installType: string;
  info: string;
  marketingConsent: boolean;
  status: ConsultationStatus;
  createdAt: string;
  photos: { id: number; name: string; mime: string; size: number; url: string }[];
}

export interface ContactMessageRecord {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  handled: boolean;
  created_at: string;
}

export interface PaymentRecord {
  id: number;
  kind: "order" | "booking";
  target_id: number;
  method: string;
  amount: number;
  phone: string | null;
  status: "pending" | "succeeded" | "failed";
  receipt: string | null;
  needs_review: number;
  failure_reason: string | null;
  created_at: string;
}

export interface AdminSummary {
  pendingBookings: number;
  confirmedUpcomingBookings: number;
  ordersToFulfil: number;
  newConsultations: number;
  unreadMessages: number;
  paymentsNeedingReview: number;
  revenue: number;
}
