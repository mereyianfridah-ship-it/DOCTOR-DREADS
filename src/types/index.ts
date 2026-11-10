export type BookingType = "instant" | "consultation";

export interface Service {
  slug: string;
  name: string;
  category: ServiceCategory;
  shortDescription: string;
  description: string;
  benefits: string[];
  image: string;
  duration: string; // placeholder text
  /** Sample price in KSh. null => "Request a Quote". */
  priceFrom: number | null;
  bookingType: BookingType;
  featured?: boolean;
}

export type ServiceCategory =
  | "Installation"
  | "Retouching"
  | "Maintenance"
  | "Styling"
  | "Natural Hair";

export type ProductCategory =
  | "Moisturizers"
  | "Moulding Gels"
  | "Natural Oils"
  | "Accessories";

export interface Product {
  slug: string;
  name: string;
  category: ProductCategory;
  shortDescription: string;
  description: string;
  /** Integer KSh (sample price) */
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

export type GalleryCategory =
  | "Loc Styles"
  | "Transformations"
  | "Natural Hair"
  | "Salon"
  | "Videos";

export interface GalleryItem {
  id: string;
  title: string;
  category: GalleryCategory;
  image: string;
  afterImage?: string; // present for before/after items
  isVideo?: boolean;
}

export interface CartLine {
  productId: string; // product slug (future: DB id)
  quantity: number;
}
