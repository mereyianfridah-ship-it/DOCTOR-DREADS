import { Router } from "express";
import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { config } from "../config.js";
import { all, get, restoreStock, run, tx } from "../db.js";
import { HttpError, notFound } from "../lib/errors.js";
import { requireAdmin } from "../lib/auth.js";
import { bookingView } from "./bookings.js";
import { orderView } from "./orders.js";

export const adminRouter = Router();
adminRouter.use("/admin", requireAdmin);

const status = (q: unknown) => (typeof q === "string" && q ? q : null);
const page = (q: any) => ({ limit: Math.min(Math.max(Number(q.limit) || 50, 1), 200), offset: Math.max(Number(q.offset) || 0, 0) });

adminRouter.get("/admin/summary", async (_req, res) => res.json({
  pendingBookings: (await get<any>("SELECT COUNT(*) AS n FROM bookings WHERE status='pending_deposit'"))!.n,
  confirmedUpcomingBookings: (await get<any>("SELECT COUNT(*) AS n FROM bookings WHERE status='confirmed'"))!.n,
  ordersToFulfil: (await get<any>("SELECT COUNT(*) AS n FROM orders WHERE status IN ('paid','processing')"))!.n,
  newConsultations: (await get<any>("SELECT COUNT(*) AS n FROM consultations WHERE status='new'"))!.n,
  unreadMessages: (await get<any>("SELECT COUNT(*) AS n FROM contact_messages WHERE handled=0"))!.n,
  paymentsNeedingReview: (await get<any>("SELECT COUNT(*) AS n FROM payments WHERE needs_review=1"))!.n,
  revenue: (await get<any>("SELECT COALESCE(SUM(amount),0) AS n FROM payments WHERE status='succeeded'"))!.n,
}));

adminRouter.get("/admin/bookings", async (req, res) => {
  const s = status(req.query.status), { limit, offset } = page(req.query);
  res.json((await all("SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.slug=b.service_slug WHERE ($1 IS NULL OR b.status=$2) ORDER BY b.date, b.time LIMIT $3 OFFSET $4", s, s, limit, offset)).map(bookingView));
});
adminRouter.patch("/admin/bookings/:reference", async (req, res) => {
  const { status: st } = z.object({ status: z.enum(["confirmed", "completed", "cancelled"]) }).parse(req.body);
  const b = await get<any>("SELECT id FROM bookings WHERE reference=$1", req.params.reference);
  if (!b) throw notFound("Booking");
  try { await run("UPDATE bookings SET status=$1, expires_at=NULL WHERE id=$2", st, b.id); }
  catch { throw new HttpError(409, "That slot is now held by another booking"); }
  res.json({ ok: true });
});

adminRouter.get("/admin/orders", async (req, res) => {
  const s = status(req.query.status), { limit, offset } = page(req.query);
  res.json((await all("SELECT * FROM orders WHERE ($1 IS NULL OR status=$2) ORDER BY id DESC LIMIT $3 OFFSET $4", s, s, limit, offset)).map(async (o) => await orderView(o)));
});
adminRouter.patch("/admin/orders/:reference", async (req, res) => {
  const { status: st } = z.object({ status: z.enum(["processing", "shipped", "delivered", "cancelled"]) }).parse(req.body);
  const o = await get<any>("SELECT * FROM orders WHERE reference=$1", req.params.reference);
  if (!o) throw notFound("Order");
  if (["pending_payment", "expired"].includes(o.status)) throw new HttpError(409, "Order has not been paid");
  await tx(async () => {
    await run("UPDATE orders SET status=$1 WHERE id=$2", st, o.id);
    if (st === "cancelled" && o.status !== "cancelled") await restoreStock(o.id);
  });
  res.json({ ok: true });
});

adminRouter.get("/admin/consultations", async (req, res) => {
  const s = status(req.query.status), { limit, offset } = page(req.query);
  const consultations = await all("SELECT * FROM consultations WHERE ($1 IS NULL OR status=$2) ORDER BY id DESC LIMIT $3 OFFSET $4", s, s, limit, offset);
  res.json(await Promise.all(consultations.map(async (c) => ({
    reference: c.reference, fullName: c.full_name, phone: c.phone, email: c.email, condition: c.hair_condition, length: c.hair_length,
    locSize: c.loc_size, installType: c.install_type, info: c.info, marketingConsent: !!c.marketing_consent, status: c.status, createdAt: c.created_at,
    photos: (await all("SELECT id, original_name AS name, mime, size FROM consultation_photos WHERE consultation_id=$1", c.id)).map((p) => ({ ...p, url: `/api/admin/consultations/${c.reference}/photos/${p.id}` })),
  }))));
});
adminRouter.patch("/admin/consultations/:reference", async (req, res) => {
  const { status: st } = z.object({ status: z.enum(["new", "contacted", "quoted", "closed"]) }).parse(req.body);
  const r = await run("UPDATE consultations SET status=$1 WHERE reference=$2", st, req.params.reference);
  if (r.rowCount === 0) throw notFound("Consultation");
  res.json({ ok: true });
});
/** Customer hair photos are private: only streamed to admins, never served statically. */
adminRouter.get("/admin/consultations/:reference/photos/:id", async (req, res) => {
  const p = await get<any>("SELECT p.* FROM consultation_photos p JOIN consultations c ON c.id=p.consultation_id WHERE c.reference=$1 AND p.id=$2", req.params.reference, Number(req.params.id));
  const file = p && path.join(config.uploadDir, path.basename(p.filename));
  if (!p || !existsSync(file)) throw notFound("Photo");
  res.setHeader("Content-Type", p.mime);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  createReadStream(file).pipe(res);
});

adminRouter.get("/admin/messages", async (req, res) => {
  const { limit, offset } = page(req.query);
  res.json((await all("SELECT * FROM contact_messages ORDER BY id DESC LIMIT $1 OFFSET $2", limit, offset)).map((m) => ({ ...m, handled: !!m.handled })));
});
adminRouter.patch("/admin/messages/:id", async (req, res) => {
  const { handled } = z.object({ handled: z.boolean() }).parse(req.body);
  const r = await run("UPDATE contact_messages SET handled=$1 WHERE id=$2", handled ? 1 : 0, Number(req.params.id));
  if (r.rowCount === 0) throw notFound("Message");
  res.json({ ok: true });
});

adminRouter.get("/admin/payments", async (req, res) => {
  const { limit, offset } = page(req.query);
  res.json(await all("SELECT id,kind,target_id,method,amount,phone,status,receipt,needs_review,failure_reason,created_at FROM payments ORDER BY id DESC LIMIT $1 OFFSET $2", limit, offset));
});

adminRouter.patch("/admin/products/:slug", async (req, res) => {
  const b = z.object({ price: z.number().int().min(0).optional(), stock: z.number().int().min(0).optional() }).parse(req.body);
  const r = await run("UPDATE products SET price=COALESCE($1,price), stock=COALESCE($2,stock) WHERE slug=$3", b.price ?? null, b.stock ?? null, req.params.slug);
  if (r.rowCount === 0) throw notFound("Product");
  res.json({ ok: true });
});
adminRouter.patch("/admin/services/:slug", async (req, res) => {
  const b = z.object({ priceFrom: z.number().int().min(0).nullable() }).parse(req.body);
  const r = await run("UPDATE services SET price_from=$1 WHERE slug=$2", b.priceFrom, req.params.slug);
  if (r.rowCount === 0) throw notFound("Service");
  res.json({ ok: true });
});
