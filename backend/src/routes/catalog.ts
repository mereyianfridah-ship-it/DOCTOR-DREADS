import { Router } from "express";
import { all, get, sweepExpired } from "../db.js";
import { notFound } from "../lib/errors.js";
import { site } from "../site.js";

export const catalogRouter = Router();

// Helper to safely parse JSON fields from Postgres
const safeParse = (str: any, fallback: any) => {
  if (!str) return fallback;
  if (typeof str !== "string") return str;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

const service = (r: any) => ({
  slug: r.slug, name: r.name, category: r.category, shortDescription: r.short_description, description: r.description,
  benefits: safeParse(r.benefits, []), image: r.image, duration: r.duration, priceFrom: r.price_from,
  bookingType: r.booking_type, featured: !!r.featured,
});

const product = (r: any) => ({
  slug: r.slug, name: r.name, category: r.category, shortDescription: r.short_description, description: r.description,
  price: r.price, stock: r.stock, images: safeParse(r.images, []), size: r.size, featured: !!r.featured,
});

/** Business rules the frontend needs (deposit %, delivery areas, stylists, slots). */
catalogRouter.get("/config", (_req, res) => res.json(site));

catalogRouter.get("/services", async (req, res) => {
  const { category, bookingType } = req.query;
  const rows = await all("SELECT * FROM services WHERE ($1::text IS NULL OR category=$2) AND ($3::text IS NULL OR booking_type=$4) ORDER BY sort",
    category, category, bookingType, bookingType);
  res.json(rows.map(service));
});

catalogRouter.get("/services/:slug", async (req, res) => {
  const r = await get("SELECT * FROM services WHERE slug=$1", req.params.slug);
  if (!r) throw notFound("Service");
  res.json(service(r));
});

catalogRouter.get("/products", async (req, res) => {
  await sweepExpired();
  const category = typeof req.query.category === "string" ? req.query.category : null;
  const status = req.query.status;
  const q = typeof req.query.q === "string" && req.query.q.trim() ? `%${req.query.q.trim().toLowerCase()}%` : null;
  const min = Number(req.query.minPrice), max = Number(req.query.maxPrice);
  const order = { price_asc: "price ASC", price_desc: "price DESC", name: "name ASC" }[String(req.query.sort)] ?? "sort ASC";
  
  const where: string[] = [
    `($1::text IS NULL OR category=$2)`,
    `($3::text IS NULL OR lower(name||' '||short_description) LIKE $4)`,
    `price >= $5 AND price <= $6`,
  ];
  
  // FIXED: Added the missing 6th parameter for maxPrice
  const params: any[] = [
    category, 
    category, 
    q, 
    q, 
    Number.isFinite(min) ? min : 0, 
    Number.isFinite(max) ? max : 999999999
  ];

  if (status) {
    where.push(`status=$${params.length + 1}`);
    params.push(status);
  } else {
    where.push("status='active'");
  }

  const rows = await all(
    `SELECT * FROM products WHERE ${where.join(" AND ")} ORDER BY ${order}`,
    ...params
  );
  res.json(rows.map(product));
});

catalogRouter.get("/products/:slug", async (req, res) => {
  await sweepExpired();
  const r = await get("SELECT * FROM products WHERE slug=$1", req.params.slug);
  if (!r) throw notFound("Product");
  res.json(product(r));
});

catalogRouter.get("/categories", async (_req, res) => {
  const rows = await all("SELECT name, slug FROM categories WHERE active=TRUE ORDER BY display_order, name");
  res.json(rows);
});

catalogRouter.get("/gallery", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : null;
  res.json((await all("SELECT * FROM gallery WHERE ($1::text IS NULL OR category=$2) ORDER BY sort", category, category))
    .map((g) => ({ id: g.id, title: g.title, category: g.category, image: g.image, afterImage: g.after_image ?? undefined, isVideo: !!g.is_video })));
});

catalogRouter.get("/testimonials", async (_req, res) => res.json(await all("SELECT id,name,detail,quote FROM testimonials ORDER BY sort")));