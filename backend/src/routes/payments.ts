import { Router } from "express";
import { timingSafeEqual, randomBytes } from "node:crypto";
import { z } from "zod";
import { config } from "../config.js";
import { all, get, run, sweepExpired, tx, type Tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { optionalAuth } from "../lib/auth.js";
import { stkPush } from "../lib/mpesa.js";
import { addMinutesToHhmm, nowIso, toMsisdn } from "../lib/util.js";
import { findBooking } from "./bookings.js";
import { findOrder } from "./orders.js";

export const paymentsRouter = Router();

/**
 * Settle a pending payment inside an already-open transaction.
 * The payment row and its target row are locked (FOR UPDATE) so concurrent
 * callbacks serialize and cannot double-credit. Idempotent: an already
 * succeeded payment is a no-op.
 */
async function settle(t$: Tx, paymentId: number, receipt: string): Promise<void> {
  const p = (await t$.get<any>("SELECT * FROM payments WHERE id=$1 FOR UPDATE", paymentId));
  if (!p) throw new HttpError(404, "Payment not found");
  if (p.status === "succeeded") return; // idempotent replay

  let review = 0;
  if (p.kind === "order") {
    const o = (await t$.get<any>("SELECT * FROM orders WHERE id=$1 FOR UPDATE", p.target_id))!;
    if (o.status === "pending_payment") {
      await t$.run("UPDATE orders SET status='paid', expires_at=NULL WHERE id=$1", o.id);
    } else if (o.status === "expired" || o.status === "cancelled") {
      // Late payment: restock only if every line is still available, else flag for review.
      const items = await t$.all<{ product_slug: string; quantity: number }>(
        "SELECT product_slug, quantity FROM order_items WHERE order_id=$1 FOR UPDATE",
        o.id
      );
      for (const i of items) {
        const prod = (await t$.get<any>("SELECT stock FROM products WHERE slug=$1 FOR UPDATE", i.product_slug))!;
        if ((prod?.stock ?? 0) < i.quantity) { review = 1; break; }
      }
      if (!review) {
        for (const i of items) await t$.run("UPDATE products SET stock = stock - $1 WHERE slug=$2", i.quantity, i.product_slug);
        await t$.run("UPDATE orders SET status='paid', expires_at=NULL WHERE id=$1", o.id);
      }
    }
  } else {
    const b = (await t$.get<any>("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", p.target_id))!;
    if (b.status === "pending_deposit") {
      await t$.run("UPDATE bookings SET status='confirmed', expires_at=NULL WHERE id=$1", b.id);
    } else if (b.status === "expired" || b.status === "cancelled") {
      const start = b.time;
      const end = addMinutesToHhmm(start, b.duration_minutes ?? 60);
      const r = await t$.run(
        `UPDATE bookings SET status='confirmed', expires_at=NULL WHERE id=$1
         AND NOT EXISTS (
           SELECT 1 FROM bookings b2
           JOIN services s ON s.slug = b2.service_slug
           WHERE b2.id <> $1
             AND b2.stylist_id = $2
             AND b2.date = $3
             AND b2.status IN ('pending_deposit','confirmed')
             AND b2.time < $4
             AND (b2.time::time + (s.duration_minutes || '60 minutes')::interval)::time > $5::time
         )`,
        b.id, b.stylist_id, b.date, end, start
      );
      if (r.rowCount !== 1) review = 1; // slot was re-taken: a human must decide
    }
  }
  await t$.run("UPDATE payments SET status='succeeded', receipt=$1, needs_review=$2, updated_at=$3 WHERE id=$4",
    receipt, review, nowIso(), paymentId);
}
const stkSchema = z.object({
  kind: z.enum(["order", "booking"]),
  reference: z.string().min(3).max(30),
  phone: z.string().optional(), // defaults to the phone on the order/booking
  email: z.string().optional(), // guests prove ownership with the email used
});

paymentsRouter.post("/payments/mpesa/stk", optionalAuth, asyncHandler(async (req, res) => {
  if (config.isProd && config.payments.mode === "mock") {
    throw new HttpError(503, "Mock payments are disabled in production");
  }
  const b = stkSchema.parse(req.body);
  await sweepExpired();
  const target = b.kind === "order" ? await findOrder(b.reference, req, b.email) : await findBooking(b.reference, req, b.email);
  const payable = b.kind === "order" ? target.status === "pending_payment" : target.status === "pending_deposit";
  if (!payable) throw new HttpError(409, `This ${b.kind} is ${target.status.replace("_", " ")} and cannot be paid`);
  const amount: number = b.kind === "order" ? target.total : target.deposit_amount; // never taken from the client
  if (amount < 1) throw new HttpError(400, "Nothing to pay");
  const msisdn = toMsisdn(b.phone ?? target.phone);
  if (!msisdn) throw new HttpError(400, "Enter a valid Kenyan M-Pesa number (e.g. 0712 345 678)", { phone: "Invalid M-Pesa number" });

  // Prevent duplicate payment requests inside the hold window.
  if (await get("SELECT 1 FROM payments WHERE kind=$1 AND target_id=$2 AND status='pending' AND created_at > $3", b.kind, target.id, new Date(Date.now() - 60_000).toISOString()))
    throw new HttpError(429, "A payment prompt was just sent: check your phone or wait a minute before retrying");

  const now = nowIso();
  if (config.payments.mode === "mock") {
    const r = await run("INSERT INTO payments (kind,target_id,method,amount,phone,status,checkout_request_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8) RETURNING id",
      b.kind, target.id, "mpesa", amount, msisdn, "MOCK-" + randomBytes(6).toString("hex"), now, now);
    await tx((t$) => settle(t$, Number(r.rows[0].id), "MOCK" + randomBytes(4).toString("hex").toUpperCase()));
    return res.json({ mode: "mock", status: "succeeded", amount, message: "Mock payment completed: no money moved." });
  }
  const ids = await stkPush({ msisdn, amount, accountRef: target.reference, description: b.kind === "order" ? "Order" : "Deposit" });
  await run("INSERT INTO payments (kind,target_id,method,amount,phone,status,checkout_request_id,merchant_request_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9)",
    b.kind, target.id, "mpesa", amount, msisdn, ids.checkoutRequestId, ids.merchantRequestId, now, now);
  res.json({ mode: "daraja", status: "pending", amount, checkoutRequestId: ids.checkoutRequestId, message: "Check your phone and enter your M-Pesa PIN." });
}));

/** Frontend polls this after the STK push until status != pending. */
paymentsRouter.get("/payments/status", optionalAuth, async (req, res) => {
  const q = z.object({ kind: z.enum(["order", "booking"]), reference: z.string(), email: z.string().optional() }).parse(req.query);
  const target = q.kind === "order" ? await findOrder(q.reference, req, q.email) : await findBooking(q.reference, req, q.email);
  const p = await get<any>("SELECT status, receipt, failure_reason FROM payments WHERE kind=$1 AND target_id=$2 ORDER BY id DESC LIMIT 1", q.kind, target.id);
  res.json({ status: p?.status ?? "none", receipt: p?.receipt ?? null, failureReason: p?.failure_reason ?? null, targetStatus: target.status });
});

const safeEq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Safaricom → us. The secret path segment authenticates the caller. Always answers 200 so Safaricom doesn't retry forever. */
paymentsRouter.post("/payments/mpesa/callback/:secret", async (req, res) => {
  const ack = { ResultCode: 0, ResultDesc: "Accepted" };
  const secret = config.payments.mpesa.callbackSecret;
  if (config.payments.mode !== "daraja" || !secret || !safeEq(String(req.params.secret), secret)) throw notFound();
  const cb = req.body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) return res.json(ack);

  await tx(async (t$) => {
    const p = (await t$.get<any>("SELECT * FROM payments WHERE checkout_request_id=$1 FOR UPDATE", cb.CheckoutRequestID));
    if (!p || p.status !== "pending") return; // unknown, already settled or already failed: idempotent
    await t$.run("UPDATE payments SET raw=$1 WHERE id=$2", JSON.stringify(cb).slice(0, 8000), p.id);
    if (cb.ResultCode !== 0) {
      await t$.run("UPDATE payments SET status='failed', failure_reason=$1, updated_at=$2 WHERE id=$3",
        String(cb.ResultDesc ?? "Payment failed").slice(0, 200), nowIso(), p.id);
      return;
    }
    const items: { Name: string; Value?: unknown }[] = cb.CallbackMetadata?.Item ?? [];
    const val = (n: string) => items.find((i) => i.Name === n)?.Value;
    // Exact amount match: under- and over-payments are rejected and flagged for review.
    if (Number(val("Amount")) !== p.amount) {
      await t$.run("UPDATE payments SET status='failed', needs_review=1, failure_reason='Amount mismatch', updated_at=$1 WHERE id=$2", nowIso(), p.id);
      return;
    }
    await settle(t$, p.id, String(val("MpesaReceiptNumber") ?? "UNKNOWN"));
  });
  return res.json(ack);
});
