import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { all, get, restoreStock, run, sweepExpired, tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { optionalAuth } from "../lib/auth.js";
import { email, phone } from "../lib/schemas.js";
import { nowIso, plusMinutesIso, reference } from "../lib/util.js";
import { site } from "../site.js";

export const ordersRouter = Router();
const MAX_QTY_PER_LINE = 10; // matches the frontend

const orderSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  phone, email,
  method: z.enum(["delivery", "collection"]),
  area: z.string().optional(),
  address: z.string().trim().max(300).optional(),
  payment: z.enum(["mpesa", "card"]),
  // Client sends only product + quantity. Prices always come from the database.
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(MAX_QTY_PER_LINE) })).min(1, "Your cart is empty").max(50),
}).superRefine((v, ctx) => {
  if (v.method === "delivery") {
    if (!site.checkout.deliveryAreas.some((a) => a.id === v.area)) ctx.addIssue({ code: "custom", path: ["area"], message: "Select a delivery area" });
    if ((v.address ?? "").length < 5) ctx.addIssue({ code: "custom", path: ["address"], message: "Enter your delivery address" });
  }
});

export const orderView = (o: any, items?: any[]) => ({
  reference: o.reference, name: o.name, phone: o.phone, email: o.email, method: o.method, area: o.area, address: o.address,
  subtotal: o.subtotal, deliveryFee: o.delivery_fee, total: o.total, paymentMethod: o.payment_method, status: o.status,
  expiresAt: o.status === "pending_payment" ? o.expires_at : null, createdAt: o.created_at,
  items: (items ?? all("SELECT product_slug, name, unit_price, quantity FROM order_items WHERE order_id=?", o.id))
    .map((i) => ({ productId: i.product_slug, name: i.name, unitPrice: i.unit_price, quantity: i.quantity })),
});

ordersRouter.post("/orders", optionalAuth, asyncHandler(async (req, res) => {
  const o = orderSchema.parse(req.body);
  if (o.payment === "card" && config.payments.mode === "daraja") throw new HttpError(501, "Card payments are not enabled yet: please pay with M-Pesa", { payment: "Card not available" });
  // Merge duplicate lines so stock is checked against the total requested.
  const wanted = new Map<string, number>();
  for (const i of o.items) wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.quantity);

  sweepExpired();
  const ref = reference("ORD");
  tx(() => {
    const lines: { slug: string; name: string; price: number; qty: number }[] = [];
    const problems: Record<string, string> = {};
    for (const [slug, qty] of wanted) {
      const p = get<any>("SELECT slug,name,price,stock FROM products WHERE slug=?", slug);
      if (!p) problems[slug] = "Product not found";
      else if (qty > MAX_QTY_PER_LINE) problems[slug] = `Maximum ${MAX_QTY_PER_LINE} per product`;
      else if (qty > p.stock) problems[slug] = p.stock === 0 ? "Out of stock" : `Only ${p.stock} left`;
      else lines.push({ slug, name: p.name, price: p.price, qty });
    }
    if (Object.keys(problems).length) throw new HttpError(409, "Some items are unavailable", problems);

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const fee = o.method === "delivery" ? site.checkout.deliveryAreas.find((a) => a.id === o.area)!.fee : 0;
    const r = run(`INSERT INTO orders (reference,user_id,name,phone,email,method,area,address,subtotal,delivery_fee,total,payment_method,status,expires_at,created_at)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'pending_payment', ?, ?)`,
      ref, req.user?.id ?? null, o.name, o.phone, o.email, o.method, o.method === "delivery" ? o.area! : null, o.method === "delivery" ? o.address! : null,
      subtotal, fee, subtotal + fee, o.payment, plusMinutesIso(config.holdMinutes), nowIso());
    for (const l of lines) {
      // Guarded decrement: fails (changes=0) if another request took the stock first.
      const u = run("UPDATE products SET stock = stock - ? WHERE slug=? AND stock >= ?", l.qty, l.slug, l.qty);
      if (u.changes !== 1) throw new HttpError(409, "Some items are unavailable", { [l.slug]: "Out of stock" });
      run("INSERT INTO order_items (order_id,product_slug,name,unit_price,quantity) VALUES (?,?,?,?,?)", Number(r.lastInsertRowid), l.slug, l.name, l.price, l.qty);
    }
  });
  res.status(201).json({ order: orderView(get("SELECT * FROM orders WHERE reference=?", ref)), payment: { amount: get<any>("SELECT total FROM orders WHERE reference=?", ref)!.total, payUrl: "/api/payments/mpesa/stk" } });
}));

export function findOrder(ref: string, req: { user?: any }, emailQ?: unknown) {
  const o = get<any>("SELECT * FROM orders WHERE reference=?", ref.toUpperCase());
  const allowed = o && (req.user?.role === "admin" || (req.user && o.user_id === req.user.id) || (typeof emailQ === "string" && emailQ.toLowerCase() === String(o.email).toLowerCase()));
  if (!allowed) throw notFound("Order");
  return o;
}
ordersRouter.get("/orders/:reference", optionalAuth, (req, res) => {
  sweepExpired();
  res.json({ order: orderView(findOrder(req.params.reference, req, req.query.email)) });
});
ordersRouter.post("/orders/:reference/cancel", optionalAuth, (req, res) => {
  const o = findOrder(req.params.reference, req, req.body?.email);
  if (o.status !== "pending_payment") throw new HttpError(409, "Only unpaid orders can be cancelled online: contact the salon");
  tx(() => { run("UPDATE orders SET status='cancelled' WHERE id=?", o.id); restoreStock(o.id); });
  res.json({ order: orderView(get("SELECT * FROM orders WHERE id=?", o.id)) });
});
