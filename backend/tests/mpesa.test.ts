import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

process.env.PAYMENTS_MODE = "daraja";
Object.assign(process.env, { MPESA_CONSUMER_KEY: "k", MPESA_CONSUMER_SECRET: "s", MPESA_SHORTCODE: "174379", MPESA_PASSKEY: "p", MPESA_CALLBACK_BASE_URL: "https://api.test", MPESA_CALLBACK_SECRET: "s3cr3t-callback-path" });

let app: any, get: any;
let n = 0;
beforeAll(async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: any) => {
    if (String(url).includes("oauth")) return new Response(JSON.stringify({ access_token: "tok", expires_in: "3599" }));
    const body = JSON.parse(init.body);
    expect(body.CallBackURL).toBe("https://api.test/api/payments/mpesa/callback/s3cr3t-callback-path");
    expect(body.PhoneNumber).toBe("254712345678");
    return new Response(JSON.stringify({ ResponseCode: "0", CheckoutRequestID: `ws_CO_${++n}`, MerchantRequestID: `m${n}` }));
  }));
  app = (await import("../src/app.js")).createApp();
  get = (await import("../src/db.js")).get;
});

const cb = (id: string, code: number, amount?: number) => ({
  Body: { stkCallback: { CheckoutRequestID: id, ResultCode: code, ResultDesc: code ? "Request cancelled by user" : "ok",
    ...(code === 0 && { CallbackMetadata: { Item: [{ Name: "Amount", Value: amount }, { Name: "MpesaReceiptNumber", Value: "QKA1B2C3D4" }] } }) } },
});
async function newOrder() {
  const r = await request(app).post("/api/orders").send({ name: "Pay Test", phone: "0712345678", email: "p@example.com", method: "collection", payment: "mpesa", items: [{ productId: "wide-tooth-comb", quantity: 1 }] });
  return r.body.order;
}

describe("daraja flow", () => {
  it("STK push stays pending until an authenticated callback confirms it", async () => {
    const o = await newOrder();
    const s = await request(app).post("/api/payments/mpesa/stk").send({ kind: "order", reference: o.reference, email: "p@example.com" });
    expect(s.body).toMatchObject({ status: "pending", amount: o.total });
    expect((await request(app).get(`/api/orders/${o.reference}?email=p@example.com`)).body.order.status).toBe("pending_payment");

    const id = s.body.checkoutRequestId;
    expect((await request(app).post("/api/payments/mpesa/callback/wrong-secret").send(cb(id, 0, o.total))).status).toBe(404);
    expect((await request(app).get(`/api/orders/${o.reference}?email=p@example.com`)).body.order.status).toBe("pending_payment");

    const ok = await request(app).post("/api/payments/mpesa/callback/s3cr3t-callback-path").send(cb(id, 0, o.total));
    expect(ok.body.ResultCode).toBe(0);
    expect((await request(app).get(`/api/orders/${o.reference}?email=p@example.com`)).body.order.status).toBe("paid");
    const st = await request(app).get(`/api/payments/status?kind=order&reference=${o.reference}&email=p@example.com`);
    expect(st.body).toMatchObject({ status: "succeeded", receipt: "QKA1B2C3D4" });
    // replayed callback is a no-op
    await request(app).post("/api/payments/mpesa/callback/s3cr3t-callback-path").send(cb(id, 0, o.total));
    expect(get("SELECT COUNT(*) n FROM payments WHERE status='succeeded'").n).toBe(1);
  });
  it("cancelled / underpaid callbacks never release the order", async () => {
    const o = await newOrder();
    const s = await request(app).post("/api/payments/mpesa/stk").send({ kind: "order", reference: o.reference, email: "p@example.com" });
    await request(app).post("/api/payments/mpesa/callback/s3cr3t-callback-path").send(cb(s.body.checkoutRequestId, 1032));
    expect((await request(app).get(`/api/payments/status?kind=order&reference=${o.reference}&email=p@example.com`)).body).toMatchObject({ status: "failed", targetStatus: "pending_payment" });

    const o2 = await newOrder();
    const s2 = await request(app).post("/api/payments/mpesa/stk").send({ kind: "order", reference: o2.reference, email: "p@example.com" });
    await request(app).post("/api/payments/mpesa/callback/s3cr3t-callback-path").send(cb(s2.body.checkoutRequestId, 0, 1));
    const st = await request(app).get(`/api/payments/status?kind=order&reference=${o2.reference}&email=p@example.com`);
    expect(st.body).toMatchObject({ status: "failed", targetStatus: "pending_payment" });
  });
  it("rejects non-Kenyan numbers and card orders", async () => {
    const o = await newOrder();
    expect((await request(app).post("/api/payments/mpesa/stk").send({ kind: "order", reference: o.reference, email: "p@example.com", phone: "12345" })).status).toBe(400);
    const c = await request(app).post("/api/orders").send({ name: "Card", phone: "0712345678", email: "c@example.com", method: "collection", payment: "card", items: [{ productId: "wide-tooth-comb", quantity: 1 }] });
    expect(c.status).toBe(501);
  });
});
