import type { GalleryItem } from "../types";

/**
 * SAMPLE IMAGERY. These are generic placeholders, NOT real Dr Dread Kenya client work.
 * Replace the image paths with real, consented photography.
 */
export const galleryCategories = [
  "Loc Styles",
  "Transformations",
  "Natural Hair",
  "Salon",
  "Videos",
] as const;

export const galleryItems: GalleryItem[] = [
  { id: "g1", title: "Loc style sample", category: "Loc Styles", image: "/images/gallery-1.svg" },
  { id: "g2", title: "Loc style sample", category: "Loc Styles", image: "/images/gallery-5.svg" },
  { id: "g3", title: "Transformation sample", category: "Transformations", image: "/images/gallery-2.svg", afterImage: "/images/gallery-6.svg" },
  { id: "g4", title: "Transformation sample", category: "Transformations", image: "/images/gallery-8.svg", afterImage: "/images/gallery-1.svg" },
  { id: "g5", title: "Natural hair sample", category: "Natural Hair", image: "/images/gallery-4.svg" },
  { id: "g6", title: "Natural hair sample", category: "Natural Hair", image: "/images/gallery-9.svg" },
  { id: "g7", title: "Salon interior sample", category: "Salon", image: "/images/gallery-3.svg" },
  { id: "g8", title: "Salon detail sample", category: "Salon", image: "/images/gallery-7.svg" },
  { id: "g9", title: "Video placeholder: loc styling", category: "Videos", image: "/images/gallery-6.svg", isVideo: true },
  { id: "g10", title: "Video placeholder: salon tour", category: "Videos", image: "/images/gallery-2.svg", isVideo: true },
];
