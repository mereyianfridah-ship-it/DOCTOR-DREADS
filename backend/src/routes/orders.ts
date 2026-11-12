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

export const orderView = async (o: any, items?: any[]) => ({
  reference: o.reference, name: o.name, phone: o.phone, email: o.email, method: o.method, area: o.area, address: o.address,
  subtotal: o.subtotal, deliveryFee: o.delivery_fee, total: o.total, paymentMethod: o.payment_method, status: o.status,
  expiresAt: o.status === "pending_payment" ? o.expires_at : null, createdAt: o.created_at,
  items: (items ?? await all("SELECT product_slug, name, unit_price, quantity FROM order_items WHERE order_id=$1", o.id))
    .map((i) => ({ productId: i.product_slug, name: i.name, unitPrice: i.unit_price, quantity: i.quantity })),
});

ordersRouter.post("/orders", optionalAuth, asyncHandler(async (req, res) => {
  const o = orderSchema.parse(req.body);
  if (o.payment === "card" && config.payments.mode === "daraja") throw new HttpError(501, "Card payments are not enabled yet: please pay with M-Pesa", { payment: "Card not available" });
  // Merge duplicate lines so stock is checked against the total requested.
  const wanted = new Map<string, number>();
  for (const i of o.items) wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.quantity);

  await sweepExpired();
  const ref = reference("ORD");
  await tx(async () => {
    const lines: { slug: string; name: string; price: number; qty: number }[] = [];
    const problems: Record<string, string> = {};
    for (const [slug, qty] of wanted) {
      const p = await get<any>("SELECT slug,name,price,stock FROM products WHERE slug=$1", slug);
      if (!p) problems[slug] = "Product not found";
      else if (qty > MAX_QTY_PER_LINE) problems[slug] = `Maximum ${MAX_QTY_PER_LINE} per product`;
      else if (qty > p.stock) problems[slug] = p.stock === 0 ? "Out of stock" : `Only ${p.stock} left`;
      else lines.push({ slug, name: p.name, price: p.price, qty });
    }
    if (Object.keys(problems).length) throw new HttpError(409, "Some items are unavailable", problems);

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const fee = o.method === "delivery" ? site.checkout.deliveryAreas.find((a) => a.id === o.area)!.fee : 0;
    const r = await run(`INSERT INTO orders (reference,user_id,name,phone,email,method,area,address,subtotal,delivery_fee,total,payment_method,status,expires_at,created_at)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, 'pending_payment', $13, $14) RETURNING id`,
      ref, req.user?.id ?? null, o.name, o.phone, o.email, o.method, o.method === "delivery" ? o.area! : null, o.method === "delivery" ? o.address! : null,
      subtotal, fee, subtotal + fee, o.payment, plusMinutesIso(config.holdMinutes), nowIso());
    const orderId = Number(r.rows[0].id);
    for (const l of lines) {
      // Guarded decrement: fails (rowCount=0) if another request took the stock first.
      const u = await run("UPDATE products SET stock = stock - $1 WHERE slug=$2 AND stock >= $3", l.qty, l.slug, l.qty);
      if (u.rowCount !== 1) throw new HttpError(409, "Some items are unavailable", { [l.slug]: "Out of stock" });
      await run("INSERT INTO order_items (order_id,product_slug,name,unit_price,quantity) VALUES ($1,$2,$3,$4,$5)", orderId, l.slug, l.name, l.price, l.qty);
    }
  });
  const orderRow = await get("SELECT * FROM orders WHERE reference=$1", ref);
  const totalRow = await get<any>("SELECT total FROM orders WHERE reference=$1", ref);
  res.status(201).json({ order: await orderView(orderRow!), payment: { amount: totalRow!.total, payUrl: "/api/payments/mpesa/stk" } });
}));

export async function findOrder(ref: string, req: { user?: any }, emailQ?: unknown) {
  const o = await get<any>("SELECT * FROM orders WHERE reference=$1", ref.toUpperCase());
  const allowed = o && (req.user?.role === "admin" || (req.user && o.user_id === req.user.id) || (typeof emailQ === "string" && emailQ.toLowerCase() === String(o.email).toLowerCase()));
  if (!allowed) throw notFound("Order");
  return o;
}
ordersRouter.get("/orders/:reference", optionalAuth, asyncHandler(async (req, res) => {
  await sweepExpired();
  res.json({ order: await orderView(await findOrder(req.params.reference, req, req.query.email)) });
}));
ordersRouter.post("/orders/:reference/cancel", optionalAuth, async (req, res) => {
  const o = await findOrder(req.params.reference, req, req.body?.email);
  if (o.status !== "pending_payment") throw new HttpError(409, "Only unpaid orders can be cancelled online: contact the salon");
  await tx(async (t$) => { await run("UPDATE orders SET status='cancelled' WHERE id=$1", o.id); await restoreStock(o.id, t$); });
  res.json({ order: await orderView(await get("SELECT * FROM orders WHERE id=$1", o.id)) });
});
