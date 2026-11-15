import { Router } from "express";
import { z } from "zod";
import { all, get, run, tx } from "../db.js";
import { HttpError, asyncHandler, notFound } from "../lib/errors.js";
import { requireAdmin } from "../lib/auth.js";
import { nowIso, todayEAT } from "../lib/util.js";
import { PAID_ORDER_STATUSES, fillDays, parseRange, pct } from "../lib/reports.js";

export const adminExtraRouter = Router();
adminExtraRouter.use("/admin", requireAdmin);

const n = (v: unknown) => Number(v ?? 0);
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/* ------------------------------ Reports ------------------------------ */

adminExtraRouter.get("/admin/reports", asyncHandler(async (req, res) => {
  const r = parseRange(req.query.from, req.query.to, todayEAT());
  const paid = [...PAID_ORDER_STATUSES];

  const [sales] = await all<any>(
    `SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue, COALESCE(SUM(delivery_fee),0) AS delivery_fees
       FROM orders WHERE status = ANY($1::text[]) AND substr(created_at,1,10) BETWEEN $2 AND $3`, paid, r.from, r.to);
  const orderStatuses = await all<any>(
    "SELECT status, COUNT(*) AS count FROM orders WHERE substr(created_at,1,10) BETWEEN $1 AND $2 GROUP BY status", r.from, r.to);
  const byMethod = await all<any>(
    `SELECT method, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders
      WHERE status = ANY($1::text[]) AND substr(created_at,1,10) BETWEEN $2 AND $3 GROUP BY method`, paid, r.from, r.to);
  const salesByDay = await all<any>(
    `SELECT substr(created_at,1,10) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue FROM orders
      WHERE status = ANY($1::text[]) AND substr(created_at,1,10) BETWEEN $2 AND $3 GROUP BY 1 ORDER BY 1`, paid, r.from, r.to);
  const topProducts = await all<any>(
    `SELECT oi.product_slug AS slug, MAX(oi.name) AS name, SUM(oi.quantity) AS units, SUM(oi.quantity*oi.unit_price) AS revenue
       FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE o.status = ANY($1::text[]) AND substr(o.created_at,1,10) BETWEEN $2 AND $3
      GROUP BY oi.product_slug ORDER BY revenue DESC LIMIT 10`, paid, r.from, r.to);

  const bookingStatuses = await all<any>("SELECT status, COUNT(*) AS count FROM bookings WHERE date BETWEEN $1 AND $2 GROUP BY status", r.from, r.to);
  const byService = await all<any>(
    `SELECT s.name, COUNT(*) AS bookings, COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.deposit_amount ELSE 0 END),0) AS deposits
       FROM bookings b JOIN services s ON s.slug=b.service_slug
      WHERE b.date BETWEEN $1 AND $2 AND b.status IN ('confirmed','completed') GROUP BY s.name ORDER BY bookings DESC LIMIT 10`, r.from, r.to);
  const byStylist = await all<any>(
    "SELECT stylist_id, COUNT(*) AS bookings FROM bookings WHERE date BETWEEN $1 AND $2 AND status IN ('confirmed','completed') GROUP BY stylist_id ORDER BY bookings DESC", r.from, r.to);
  const [refunds] = await all<any>(
    `SELECT COALESCE(SUM(CASE WHEN refund_status='due' THEN refund_amount END),0) AS due,
            COALESCE(SUM(CASE WHEN refund_status='refunded' THEN refund_amount END),0) AS paid
       FROM bookings WHERE date BETWEEN $1 AND $2`, r.from, r.to);
  const bookingsByDay = await all<any>(
    "SELECT date AS day, COUNT(*) AS bookings FROM bookings WHERE date BETWEEN $1 AND $2 AND status IN ('confirmed','completed') GROUP BY date ORDER BY date", r.from, r.to);
  const [newCustomers] = await all<any>("SELECT COUNT(*) AS n FROM users WHERE role='customer' AND substr(created_at,1,10) BETWEEN $1 AND $2", r.from, r.to);

  const [inv] = await all<any>(
    `SELECT COUNT(*) AS products,
            COUNT(*) FILTER (WHERE stock = 0) AS out_of_stock,
            COUNT(*) FILTER (WHERE stock > 0 AND stock <= low_stock_threshold) AS low_stock,
            COALESCE(SUM(stock*price),0) AS stock_value, COALESCE(SUM(stock),0) AS units
       FROM products WHERE status <> 'archived'`);
  const attention = await all<any>(
    `SELECT slug, name, stock, low_stock_threshold AS threshold FROM products
      WHERE status <> 'archived' AND stock <= low_stock_threshold ORDER BY stock ASC, name LIMIT 50`);

  const totalBookings = bookingStatuses.reduce((a, x) => a + n(x.count), 0);
  const cancelled = n(bookingStatuses.find((x) => x.status === "cancelled")?.count);
  const completed = n(bookingStatuses.find((x) => x.status === "completed")?.count);
  const depositsCollected = byService.reduce((a, x) => a + n(x.deposits), 0);

  res.json({
    range: r,
    sales: {
      orders: n(sales?.orders), revenue: n(sales?.revenue), deliveryFees: n(sales?.delivery_fees),
      averageOrder: n(sales?.orders) ? Math.round(n(sales?.revenue) / n(sales?.orders)) : 0,
      byStatus: orderStatuses.map((x) => ({ status: x.status, count: n(x.count) })),
      byMethod: byMethod.map((x) => ({ method: x.method, orders: n(x.orders), revenue: n(x.revenue) })),
      byDay: fillDays(r, salesByDay.map((x) => ({ day: x.day, orders: n(x.orders), revenue: n(x.revenue) })), { orders: 0, revenue: 0 }),
      topProducts: topProducts.map((x) => ({ slug: x.slug, name: x.name, units: n(x.units), revenue: n(x.revenue) })),
    },
    bookings: {
      total: totalBookings, cancellationRate: pct(cancelled, totalBookings), completed,
      byStatus: bookingStatuses.map((x) => ({ status: x.status, count: n(x.count) })),
      byService: byService.map((x) => ({ name: x.name, bookings: n(x.bookings), deposits: n(x.deposits) })),
      byStylist: byStylist.map((x) => ({ stylistId: x.stylist_id, bookings: n(x.bookings) })),
      byDay: fillDays(r, bookingsByDay.map((x) => ({ day: x.day, bookings: n(x.bookings) })), { bookings: 0 }),
      depositsCollected, refundsDue: n(refunds?.due), refundsPaid: n(refunds?.paid),
    },
    inventory: {
      products: n(inv?.products), outOfStock: n(inv?.out_of_stock), lowStock: n(inv?.low_stock),
      units: n(inv?.units), stockValue: n(inv?.stock_value),
      needsAttention: attention.map((x) => ({ slug: x.slug, name: x.name, stock: n(x.stock), threshold: n(x.threshold) })),
    },
    performance: {
      productRevenue: n(sales?.revenue), bookingDeposits: depositsCollected,
      totalRevenue: n(sales?.revenue) + depositsCollected,
      newCustomers: n(newCustomers?.n),
    },
  });
}));

/* --------------------------- Stock movements --------------------------- */

adminExtraRouter.post("/admin/products/:slug/stock", asyncHandler(async (req, res) => {
  const body = z.object({
    change: z.number().int().refine((v) => v !== 0, "Enter a change other than 0").refine((v) => Math.abs(v) <= 100000, "Too large"),
    reason: z.string().trim().min(3, "Give a short reason").max(200),
  }).parse(req.body);
  const slug = req.params.slug;
  const result = await tx(async (t$) => {
    const row = await t$.get<{ stock: number }>("SELECT stock FROM products WHERE slug=$1 FOR UPDATE", slug);
    if (!row) throw notFound("Product");
    const next = row.stock + body.change;
    if (next < 0) throw new HttpError(409, `Only ${row.stock} in stock; that would go below zero`, { change: "Below zero" });
    await t$.run("UPDATE products SET stock=$1, updated_at=NOW() WHERE slug=$2", next, slug);
    await t$.run(
      "INSERT INTO stock_movements (product_slug, previous_stock, new_stock, reason, change_type) VALUES ($1,$2,$3,$4,$5)",
      slug, row.stock, next, body.reason, body.change > 0 ? "increase" : "decrease",
    );
    return { previous: row.stock, stock: next };
  });
  res.json({ ok: true, ...result });
}));

adminExtraRouter.get("/admin/stock-movements", asyncHandler(async (req, res) => {
  const slug = typeof req.query.slug === "string" && req.query.slug ? req.query.slug : null;
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const rows = await all<any>(
    `SELECT m.id, m.product_slug, p.name AS product_name, m.previous_stock, m.new_stock, m.reason, m.change_type, m.order_id, m.created_at
       FROM stock_movements m LEFT JOIN products p ON p.slug=m.product_slug
      WHERE ($1::text IS NULL OR m.product_slug=$1) ORDER BY m.id DESC LIMIT $2`, slug, limit);
  res.json(rows.map((m) => ({
    id: m.id, productSlug: m.product_slug, productName: m.product_name ?? m.product_slug, previousStock: m.previous_stock,
    newStock: m.new_stock, delta: m.new_stock - m.previous_stock, reason: m.reason, type: m.change_type, orderId: m.order_id, createdAt: m.created_at,
  })));
}));

/* ----------------------------- Categories ----------------------------- */

const categoryBody = z.object({
  name: z.string().trim().min(1).max(60),
  description: z.string().trim().max(300).optional(),
  displayOrder: z.number().int().min(0).max(9999).optional(),
  active: z.boolean().optional(),
});

adminExtraRouter.get("/admin/categories", asyncHandler(async (_req, res) => {
  const rows = await all<any>(
    `SELECT c.id, c.name, c.slug, c.description, c.display_order, c.active,
            (SELECT COUNT(*) FROM products p WHERE p.category = c.name) AS products
       FROM categories c ORDER BY c.display_order, c.name`);
  res.json(rows.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", displayOrder: c.display_order, active: c.active, products: n(c.products) })));
}));

adminExtraRouter.post("/admin/categories", asyncHandler(async (req, res) => {
  const b = categoryBody.parse(req.body);
  const slug = slugify(b.name);
  if (!slug) throw new HttpError(400, "Enter a name with letters or numbers", { name: "Invalid name" });
  if (await get("SELECT 1 FROM categories WHERE slug=$1 OR LOWER(name)=LOWER($2)", slug, b.name)) throw new HttpError(409, "That category already exists", { name: "Already exists" });
  const r = await run(
    "INSERT INTO categories (name, slug, description, display_order, active) VALUES ($1,$2,$3,$4,$5) RETURNING id",
    b.name, slug, b.description ?? "", b.displayOrder ?? 0, b.active ?? true);
  res.status(201).json({ ok: true, id: r.rows[0].id });
}));

adminExtraRouter.patch("/admin/categories/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = categoryBody.partial().parse(req.body);
  await tx(async (t$) => {
    const cur = await t$.get<{ name: string }>("SELECT name FROM categories WHERE id=$1 FOR UPDATE", id);
    if (!cur) throw notFound("Category");
    if (b.name !== undefined && b.name !== cur.name) {
      if (await t$.get("SELECT 1 FROM categories WHERE LOWER(name)=LOWER($1) AND id<>$2", b.name, id)) throw new HttpError(409, "That category already exists", { name: "Already exists" });
      // Products store the category by name, so they follow the rename. The slug stays stable so links keep working.
      await t$.run("UPDATE products SET category=$1 WHERE category=$2", b.name, cur.name);
      await t$.run("UPDATE categories SET name=$1 WHERE id=$2", b.name, id);
    }
    if (b.description !== undefined) await t$.run("UPDATE categories SET description=$1 WHERE id=$2", b.description, id);
    if (b.displayOrder !== undefined) await t$.run("UPDATE categories SET display_order=$1 WHERE id=$2", b.displayOrder, id);
    if (b.active !== undefined) await t$.run("UPDATE categories SET active=$1 WHERE id=$2", b.active, id);
    await t$.run("UPDATE categories SET updated_at=NOW() WHERE id=$1", id);
  });
  res.json({ ok: true });
}));

adminExtraRouter.delete("/admin/categories/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const c = await get<{ name: string }>("SELECT name FROM categories WHERE id=$1", id);
  if (!c) throw notFound("Category");
  const used = n((await get<any>("SELECT COUNT(*) AS n FROM products WHERE category=$1", c.name))?.n);
  if (used > 0) throw new HttpError(409, `${used} product${used === 1 ? " uses" : "s use"} this category. Move them first, or deactivate it instead.`);
  await run("DELETE FROM categories WHERE id=$1", id);
  res.json({ ok: true });
}));

/* ------------------------------ Services ------------------------------ */

const serviceBody = z.object({
  name: z.string().trim().min(2).max(100),
  category: z.string().trim().min(1).max(60),
  shortDescription: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1).max(4000),
  benefits: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  duration: z.string().trim().min(1).max(80),
  durationMinutes: z.number().int().min(15).max(720),
  priceFrom: z.number().int().min(0).nullable(),
  bookingType: z.enum(["instant", "consultation"]),
  featured: z.boolean().default(false),
}).superRefine((v, ctx) => {
  if (v.bookingType === "instant" && v.priceFrom === null)
    ctx.addIssue({ code: "custom", path: ["priceFrom"], message: "Instant-booking services need a price" });
});

const SERVICE_COLS = "name=$2, category=$3, short_description=$4, description=$5, benefits=$6, duration=$7, duration_minutes=$8, price_from=$9, booking_type=$10, featured=$11";

adminExtraRouter.get("/admin/services", asyncHandler(async (_req, res) => {
  const rows = await all<any>("SELECT *, duration_minutes FROM services ORDER BY sort, name");
  res.json(rows.map((s) => ({
    slug: s.slug, name: s.name, category: s.category, shortDescription: s.short_description, description: s.description,
    benefits: (() => { try { return JSON.parse(s.benefits); } catch { return []; } })(), image: s.image, duration: s.duration,
    durationMinutes: s.duration_minutes, priceFrom: s.price_from, bookingType: s.booking_type, featured: !!s.featured,
  })));
}));

adminExtraRouter.post("/admin/services", asyncHandler(async (req, res) => {
  const b = serviceBody.parse(req.body);
  const slug = slugify(b.name);
  if (!slug) throw new HttpError(400, "Enter a name with letters or numbers", { name: "Invalid name" });
  if (await get("SELECT 1 FROM services WHERE slug=$1", slug)) throw new HttpError(409, "A service with this name already exists", { name: "Already exists" });
  await run(
    `INSERT INTO services (slug, name, category, short_description, description, benefits, image, duration, duration_minutes, price_from, booking_type, featured, sort)
     VALUES ($1,$2,$3,$4,$5,$6,'',$7,$8,$9,$10,$11, COALESCE((SELECT MAX(sort)+1 FROM services),0))`,
    slug, b.name, b.category, b.shortDescription, b.description, JSON.stringify(b.benefits), b.duration, b.durationMinutes, b.priceFrom, b.bookingType, b.featured ? 1 : 0);
  res.status(201).json({ ok: true, slug });
}));

adminExtraRouter.put("/admin/services/:slug", asyncHandler(async (req, res) => {
  const b = serviceBody.parse(req.body);
  const r = await run(`UPDATE services SET ${SERVICE_COLS} WHERE slug=$1`, req.params.slug, b.name, b.category, b.shortDescription, b.description,
    JSON.stringify(b.benefits), b.duration, b.durationMinutes, b.priceFrom, b.bookingType, b.featured ? 1 : 0);
  if (r.rowCount === 0) throw notFound("Service");
  res.json({ ok: true });
}));

adminExtraRouter.delete("/admin/services/:slug", asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  if (!(await get("SELECT 1 FROM services WHERE slug=$1", slug))) throw notFound("Service");
  const active = n((await get<any>("SELECT COUNT(*) AS n FROM bookings WHERE service_slug=$1 AND status IN ('pending_deposit','confirmed')", slug))?.n);
  if (active > 0) throw new HttpError(409, `${active} upcoming booking${active === 1 ? "" : "s"} use this service. Cancel or complete them first.`);
  try { await run("DELETE FROM services WHERE slug=$1", slug); }
  catch { throw new HttpError(409, "Past bookings refer to this service, so it can't be deleted. Contact the developer to archive it instead."); }
  res.json({ ok: true, deletedAt: nowIso() });
}));
