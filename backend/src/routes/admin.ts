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

adminRouter.get("/admin/summary", (_req, res) => res.json({
  pendingBookings: get<any>("SELECT COUNT(*) n FROM bookings WHERE status='pending_deposit'")!.n,
  confirmedUpcomingBookings: get<any>("SELECT COUNT(*) n FROM bookings WHERE status='confirmed'")!.n,
  ordersToFulfil: get<any>("SELECT COUNT(*) n FROM orders WHERE status IN ('paid','processing')")!.n,
  newConsultations: get<any>("SELECT COUNT(*) n FROM consultations WHERE status='new'")!.n,
  unreadMessages: get<any>("SELECT COUNT(*) n FROM contact_messages WHERE handled=0")!.n,
  paymentsNeedingReview: get<any>("SELECT COUNT(*) n FROM payments WHERE needs_review=1")!.n,
  revenue: get<any>("SELECT COALESCE(SUM(amount),0) n FROM payments WHERE status='succeeded'")!.n,
}));

adminRouter.get("/admin/bookings", (req, res) => {
  const s = status(req.query.status), { limit, offset } = page(req.query);
  res.json(all("SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.slug=b.service_slug WHERE (? IS NULL OR b.status=?) ORDER BY b.date, b.time LIMIT ? OFFSET ?", s, s, limit, offset).map(bookingView));
});
adminRouter.patch("/admin/bookings/:reference", (req, res) => {
  const { status: st } = z.object({ status: z.enum(["confirmed", "completed", "cancelled"]) }).parse(req.body);
  const b = get<any>("SELECT id FROM bookings WHERE reference=?", req.params.reference);
  if (!b) throw notFound("Booking");
  try { run("UPDATE bookings SET status=?, expires_at=NULL WHERE id=?", st, b.id); }
  catch { throw new HttpError(409, "That slot is now held by another booking"); }
  res.json({ ok: true });
});

adminRouter.get("/admin/orders", (req, res) => {
  const s = status(req.query.status), { limit, offset } = page(req.query);
  res.json(all("SELECT * FROM orders WHERE (? IS NULL OR status=?) ORDER BY id DESC LIMIT ? OFFSET ?", s, s, limit, offset).map((o) => orderView(o)));
});
adminRouter.patch("/admin/orders/:reference", (req, res) => {
  const { status: st } = z.object({ status: z.enum(["processing", "shipped", "delivered", "cancelled"]) }).parse(req.body);
  const o = get<any>("SELECT * FROM orders WHERE reference=?", req.params.reference);
  if (!o) throw notFound("Order");
  if (["pending_payment", "expired"].includes(o.status)) throw new HttpError(409, "Order has not been paid");
  tx(() => {
    run("UPDATE orders SET status=? WHERE id=?", st, o.id);
    if (st === "cancelled" && o.status !== "cancelled") restoreStock(o.id);
  });
  res.json({ ok: true });
});

adminRouter.get("/admin/consultations", (req, res) => {
  const s = status(req.query.status), { limit, offset } = page(req.query);
  res.json(all("SELECT * FROM consultations WHERE (? IS NULL OR status=?) ORDER BY id DESC LIMIT ? OFFSET ?", s, s, limit, offset).map((c) => ({
    reference: c.reference, fullName: c.full_name, phone: c.phone, email: c.email, condition: c.hair_condition, length: c.hair_length,
    locSize: c.loc_size, installType: c.install_type, info: c.info, marketingConsent: !!c.marketing_consent, status: c.status, createdAt: c.created_at,
    photos: all("SELECT id, original_name AS name, mime, size FROM consultation_photos WHERE consultation_id=?", c.id).map((p) => ({ ...p, url: `/api/admin/consultations/${c.reference}/photos/${p.id}` })),
  })));
});
adminRouter.patch("/admin/consultations/:reference", (req, res) => {
  const { status: st } = z.object({ status: z.enum(["new", "contacted", "quoted", "closed"]) }).parse(req.body);
  if (run("UPDATE consultations SET status=? WHERE reference=?", st, req.params.reference).changes === 0) throw notFound("Consultation");
  res.json({ ok: true });
});
/** Customer hair photos are private: only streamed to admins, never served statically. */
adminRouter.get("/admin/consultations/:reference/photos/:id", (req, res) => {
  const p = get<any>("SELECT p.* FROM consultation_photos p JOIN consultations c ON c.id=p.consultation_id WHERE c.reference=? AND p.id=?", req.params.reference, Number(req.params.id));
  const file = p && path.join(config.uploadDir, path.basename(p.filename));
  if (!p || !existsSync(file)) throw notFound("Photo");
  res.setHeader("Content-Type", p.mime);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  createReadStream(file).pipe(res);
});

adminRouter.get("/admin/messages", (req, res) => {
  const { limit, offset } = page(req.query);
  res.json(all("SELECT * FROM contact_messages ORDER BY id DESC LIMIT ? OFFSET ?", limit, offset).map((m) => ({ ...m, handled: !!m.handled })));
});
adminRouter.patch("/admin/messages/:id", (req, res) => {
  const { handled } = z.object({ handled: z.boolean() }).parse(req.body);
  if (run("UPDATE contact_messages SET handled=? WHERE id=?", handled ? 1 : 0, Number(req.params.id)).changes === 0) throw notFound("Message");
  res.json({ ok: true });
});

adminRouter.get("/admin/payments", (req, res) => {
  const { limit, offset } = page(req.query);
  res.json(all("SELECT id,kind,target_id,method,amount,phone,status,receipt,needs_review,failure_reason,created_at FROM payments ORDER BY id DESC LIMIT ? OFFSET ?", limit, offset));
});

adminRouter.patch("/admin/products/:slug", (req, res) => {
  const b = z.object({ price: z.number().int().min(0).optional(), stock: z.number().int().min(0).optional() }).parse(req.body);
  if (run("UPDATE products SET price=COALESCE(?,price), stock=COALESCE(?,stock) WHERE slug=?", b.price ?? null, b.stock ?? null, req.params.slug).changes === 0) throw notFound("Product");
  res.json({ ok: true });
});
adminRouter.patch("/admin/services/:slug", (req, res) => {
  const b = z.object({ priceFrom: z.number().int().min(0).nullable() }).parse(req.body);
  if (run("UPDATE services SET price_from=? WHERE slug=?", b.priceFrom, req.params.slug).changes === 0) throw notFound("Service");
  res.json({ ok: true });
});
