import { z } from "zod";

export const productCreateSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  shortDescription: z.string().min(1, "Short description is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().optional(),
  price: z.number().int().min(0, "Price must be a positive integer"),
  stock: z.number().int().min(0, "Stock must be a non-negative integer"),
  size: z.string().optional(),
  images: z.array(z.string()).default([]),
  // REMOVED duplicate size
  featured: z.boolean().default(false),
  status: z.enum(["draft", "active", "archived"]).default("draft"),
  low_stock_threshold: z.number().int().min(0).default(5),
});

export const productUpdateSchema = z.object({
  name: z.string().min(1, "Product name is required").optional(),
  shortDescription: z.string().min(1, "Short description is required").optional(),
  description: z.string().min(1, "Description is required").optional(),
  category: z.string().optional(),
  price: z.number().int().min(0, "Price must be a positive integer").optional(),
  stock: z.number().int().min(0, "Stock must be a non-negative integer").optional(),
  size: z.string().optional(),
  images: z.array(z.string()).optional(),
  featured: z.boolean().optional(),
  status: z.enum(["draft", "active", "archived"]).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
});

export const productView = (r: any) => ({
  id: r.id,
  slug: r.slug,
  name: r.name,
  category: r.category,
  shortDescription: r.short_description,
  description: r.description,
  price: r.price,
  stock: r.stock,
  images: JSON.parse(r.images ?? "[]"), // Added fallback just in case
  size: r.size,
  featured: !!r.featured,
  status: r.status,
  low_stock_threshold: r.low_stock_threshold,
  created_at: r.created_at,
  updated_at: r.updated_at,
});

export const statusView = (r: any) => ({
  slug: r.slug,
  name: r.name,
  category: r.category,
  price: r.price,
  stock: r.stock,
  status: r.status,
});