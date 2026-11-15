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
  /** Product status: draft, active, or archived */
  status: 'draft' | 'active' | 'archived';
  /** Low stock threshold (trigger warning when stock <= this value) */
  low_stock_threshold: number;
}

export interface Testimonial {
  id: string;
  name: string;
  detail: string;
  quote: string;
  /** 1-5, absent on reviews the owner added by hand. */
  rating?: number | null;
}

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface ReviewRecord extends Testimonial {
  email: string | null;
  status: ReviewStatus;
  created_at: string | null;
  reviewed_at: string | null;
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
  role: "customer" | "admin" | "stylist" | "order-manager" | "owner";
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
  rescheduleCount?: number;
  /** Server-decided: status, limit and notice period already checked. */
  canReschedule?: boolean;
  rescheduleBlockedReason?: string | null;
  cancelledAt?: string | null;
  /** KSh owed back to the customer after cancellation (0 = none). */
  refundAmount?: number;
  refundStatus?: "due" | "refunded" | null;
  refundedAt?: string | null;
  /** What cancelling now would return; only on active bookings. */
  refundQuote?: { amount: number; percent: number; tier: "full" | "partial" | "none" | "not_paid"; message: string } | null;
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
  quotationAmount: number | null;
  quotationNote: string;
  quotedAt: string | null;
  quotationResponse: QuotationResponse | null;
  quotationRespondedAt: string | null;
  photos: { id: number; name: string; mime: string; size: number; url: string }[];
}

/** What a customer sees about their own consultation request (no contact details, no photo URLs). */
export type QuotationResponse = "accepted" | "declined";
export interface ConsultationQuotation {
  amount: number;
  note: string;
  quotedAt: string | null;
  response: QuotationResponse | null;
  respondedAt: string | null;
}
export interface ConsultationNote {
  id: number;
  authorName: string;
  body: string;
  createdAt: string;
}
export interface PublicConsultation {
  reference: string;
  status: ConsultationStatus;
  createdAt: string;
  condition: string;
  length: string;
  locSize: string;
  installType: string;
  info: string;
  photos: number;
  quotation: ConsultationQuotation | null;
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
  pendingReviews: number;
  paymentsNeedingReview: number;
  revenue: number;
}

/** Owner-editable business details (Admin > Settings). Empty string = not set. */
export interface BusinessSettings {
  location: string;
  phone: string;
  whatsapp: string;
  email: string;
  hours: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

/** What the public site reads (same shape as siteConfig.contact / siteConfig.social). */
export interface BusinessPublic {
  location: string;
  contact: {
    phoneDisplay: string;
    phoneHref: string | null;
    whatsappDisplay: string;
    whatsappHref: string | null;
    emailDisplay: string;
    emailHref: string | null;
    hours: string;
  };
  social: { id: string; label: string; href: string | null }[];
}

export interface AdminStylist {
  id: string;
  name: string;
  note: string;
  active: boolean;
  upcomingBookings: number;
}
