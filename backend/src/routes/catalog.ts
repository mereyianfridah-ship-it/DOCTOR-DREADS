import { Router } from "express";
import { all, get, sweepExpired } from "../db.js";
import { notFound } from "../lib/errors.js";
import { site } from "../site.js";

export const catalogRouter = Router();

const service = (r: any) => ({
  slug: r.slug, name: r.name, category: r.category, shortDescription: r.short_description, description: r.description,
  benefits: JSON.parse(r.benefits), image: r.image, duration: r.duration, priceFrom: r.price_from,
  bookingType: r.booking_type, featured: !!r.featured,
});
const product = (r: any) => ({
  slug: r.slug, name: r.name, category: r.category, shortDescription: r.short_description, description: r.description,
  price: r.price, stock: r.stock, images: JSON.parse(r.images), size: r.size, featured: !!r.featured,
});

/** Business rules the frontend needs (deposit %, delivery areas, stylists, slots). */
catalogRouter.get("/config", (_req, res) => res.json(site));

catalogRouter.get("/services", (req, res) => {
  const { category, bookingType } = req.query;
  const rows = all("SELECT * FROM services WHERE (? IS NULL OR category=?) AND (? IS NULL OR booking_type=?) ORDER BY sort",
    ...[category, category, bookingType, bookingType].map((v) => (typeof v === "string" ? v : null)));
  res.json(rows.map(service));
});
catalogRouter.get("/services/:slug", (req, res) => {
  const r = get("SELECT * FROM services WHERE slug=?", req.params.slug);
  if (!r) throw notFound("Service");
  res.json(service(r));
});

catalogRouter.get("/products", (req, res) => {
  sweepExpired();
  const category = typeof req.query.category === "string" ? req.query.category : null;
  const q = typeof req.query.q === "string" && req.query.q.trim() ? `%${req.query.q.trim().toLowerCase()}%` : null;
  const min = Number(req.query.minPrice), max = Number(req.query.maxPrice);
  const order = { price_asc: "price ASC", price_desc: "price DESC", name: "name ASC" }[String(req.query.sort)] ?? "sort ASC";
  const rows = all(
    `SELECT * FROM products WHERE (? IS NULL OR category=?) AND (? IS NULL OR lower(name||' '||short_description) LIKE ?)
     AND price >= ? AND price <= ? ORDER BY ${order}`,
    category, category, q, q, Number.isFinite(min) ? min : 0, Number.isFinite(max) && req.query.maxPrice ? max : 2_000_000_000);
  res.json(rows.map(product));
});
catalogRouter.get("/products/:slug", (req, res) => {
  sweepExpired();
  const r = get("SELECT * FROM products WHERE slug=?", req.params.slug);
  if (!r) throw notFound("Product");
  res.json(product(r));
});

catalogRouter.get("/gallery", (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : null;
  res.json(all("SELECT * FROM gallery WHERE (? IS NULL OR category=?) ORDER BY sort", category, category)
    .map((g) => ({ id: g.id, title: g.title, category: g.category, image: g.image, afterImage: g.after_image ?? undefined, isVideo: !!g.is_video })));
});
catalogRouter.get("/testimonials", (_req, res) => res.json(all("SELECT id,name,detail,quote FROM testimonials ORDER BY sort")));
