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
  const q = typeof req.query.q === "string" && req.query.q.trim() ? `%${req.query.q.trim().toLowerCase()}%` : null;
  const min = Number(req.query.minPrice), max = Number(req.query.maxPrice);
  const order = { price_asc: "price ASC", price_desc: "price DESC", name: "name ASC" }[String(req.query.sort)] ?? "sort ASC";
  const rows = await all(
    `SELECT * FROM products WHERE ($1::text IS NULL OR category=$2) AND ($3::text IS NULL OR lower(name||' '||short_description) LIKE $4)
     AND price >= $5 AND price <= $6 ORDER BY ${order}`,
    category, category, q, q, Number.isFinite(min) ? min : 0, Number.isFinite(max) && req.query.maxPrice ? max : 2_000_000_000);
  res.json(rows.map(product));
});
catalogRouter.get("/products/:slug", async (req, res) => {
  await sweepExpired();
  const r = await get("SELECT * FROM products WHERE slug=$1", req.params.slug);
  if (!r) throw notFound("Product");
  res.json(product(r));
});

catalogRouter.get("/gallery", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : null;
  res.json((await all("SELECT * FROM gallery WHERE ($1::text IS NULL OR category=$2) ORDER BY sort", category, category))
    .map((g) => ({ id: g.id, title: g.title, category: g.category, image: g.image, afterImage: g.after_image ?? undefined, isVideo: !!g.is_video })));
});
catalogRouter.get("/testimonials", async (_req, res) => res.json(await all("SELECT id,name,detail,quote FROM testimonials ORDER BY sort")));
