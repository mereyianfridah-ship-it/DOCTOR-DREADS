import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.js";
import { get, run, initDb, seedIfEmpty } from "../src/db.js";
import { addDays, todayEAT } from "../src/lib/util.js";

const app = createApp();
const api = () => request(app);

beforeAll(async () => {
  await initDb();
  // Clean slate for each test run (preserves schema, resets data).
  await run(`TRUNCATE users, services, products, gallery, testimonials, bookings, orders, order_items, payments, consultations, consultation_photos, contact_messages, media_assets, tiktok_videos RESTART IDENTITY CASCADE`);
  await seedIfEmpty();
});

/** next open (non-Sunday) date, `n` days+ ahead */
function openDate(n = 3) {
  let d = addDays(todayEAT(), n);
  while (new Date(d + "T00:00:00Z").getUTCDay() === 0) d = addDays(d, 1);
  return d;
}
const customer = { fullName: "Amina Test", email: "amina@example.com", phone: "0712345678", password: "supersecret1", terms: true };
const guest = { name: "Guest Buyer", phone: "0712345678", email: "guest@example.com" };

describe("catalog", () => {
  it("serves seeded services, products, gallery, config", async () => {
    expect((await api().get("/api/services")).body.length).toBeGreaterThan(3);
    expect((await api().get("/api/services?bookingType=instant")).body.every((s: any) => s.bookingType === "instant")).toBe(true);
    const products = (await api().get("/api/products?sort=price_asc")).body;
    expect(products[0].price).toBeLessThanOrEqual(products[1].price);
    expect((await api().get("/api/products/nope")).status).toBe(404);
    expect((await api().get("/api/config")).body.booking.depositPercent).toBe(30);
    expect((await api().get("/api/gallery?category=Salon")).body.every((g: any) => g.category === "Salon")).toBe(true);
  });
});

describe("auth", () => {
  it("registers, rejects duplicates, logs in, protects /me", async () => {
    const r = await api().post("/api/auth/register").send(customer);
    expect(r.status).toBe(201);
    expect(r.body.user.password_hash).toBeUndefined();
    expect((await api().post("/api/auth/register").send(customer)).status).toBe(409);
    expect((await api().post("/api/auth/register").send({ ...customer, email: "x@example.com", password: "short", terms: true })).status).toBe(400);
    expect((await api().post("/api/auth/login").send({ email: customer.email, password: "wrongpass1" })).status).toBe(401);
    const l = await api().post("/api/auth/login").send({ email: "AMINA@example.com", password: customer.password });
    expect(l.status).toBe(200);
    expect((await api().get("/api/auth/me")).status).toBe(401);
    expect((await api().get("/api/auth/me").set("Authorization", `Bearer ${l.body.token}`)).body.user.email).toBe(customer.email);
    expect((await api().get("/api/auth/me").set("Authorization", "Bearer garbage")).status).toBe(401);
  });
  it("blocks customers from admin routes", async () => {
    const l = await api().post("/api/auth/login").send({ email: customer.email, password: customer.password });
    expect((await api().get("/api/admin/orders").set("Authorization", `Bearer ${l.body.token}`)).status).toBe(403);
    expect((await api().get("/api/admin/orders")).status).toBe(401);
  });
});

describe("bookings", () => {
  const date = openDate();
  const body = { serviceSlug: "loc-retouching", location: "salon", date, time: "10:00", stylist: "auto", fullName: "Booker", phone: "0700111222", email: "book@example.com", notes: "" };

  it("computes the deposit server-side and prevents double booking", async () => {
    const a = await api().post("/api/bookings").send({ ...body, depositAmount: 1 });
    expect(a.status).toBe(201);
    expect(a.body.booking.depositAmount).toBe(750); // 30% of 2500
    expect(a.body.booking.status).toBe("pending_deposit");
    const b = await api().post("/api/bookings").send({ ...body, email: "b2@example.com" });
    expect(b.status).toBe(201); // second stylist auto-assigned
    expect(b.body.booking.stylistId).not.toBe(a.body.booking.stylistId);
    const c = await api().post("/api/bookings").send({ ...body, email: "b3@example.com" });
    expect(c.status).toBe(409); // both stylists busy
    const av = await api().get(`/api/availability?date=${date}`);
    expect(av.body.slots.find((s: any) => s.time === "10:00").available).toBe(false);
    expect(av.body.slots.find((s: any) => s.time === "11:00").available).toBe(true);
  });
  it("rejects bad input: past date, Sunday, consultation-only service, unknown slot", async () => {
    expect((await api().post("/api/bookings").send({ ...body, date: todayEAT() })).status).toBe(400);
    let sunday = addDays(todayEAT(), 2); while (new Date(sunday + "T00:00:00Z").getUTCDay() !== 0) sunday = addDays(sunday, 1);
    expect((await api().post("/api/bookings").send({ ...body, date: sunday })).status).toBe(400);
    expect((await api().post("/api/bookings").send({ ...body, serviceSlug: "loc-installation", time: "11:00" })).status).toBe(400);
    expect((await api().post("/api/bookings").send({ ...body, time: "03:33" })).status).toBe(400);
  });
  it("guests need reference + email; wrong email looks like not-found", async () => {
    const a = await api().post("/api/bookings").send({ ...body, time: "12:00" });
    const ref = a.body.booking.reference;
    expect((await api().get(`/api/bookings/${ref}`)).status).toBe(404);
    expect((await api().get(`/api/bookings/${ref}?email=evil@example.com`)).status).toBe(404);
    expect((await api().get(`/api/bookings/${ref}?email=BOOK@example.com`)).status).toBe(200);
  });
  it("pays deposit via mock M-Pesa, confirming the booking; cancel frees the slot", async () => {
    const a = await api().post("/api/bookings").send({ ...body, time: "14:00" });
    const ref = a.body.booking.reference;
    const p = await api().post("/api/payments/mpesa/stk").send({ kind: "booking", reference: ref, email: "book@example.com", amount: 1 });
    expect(p.body).toMatchObject({ status: "succeeded", amount: 750 });
    expect((await api().get(`/api/bookings/${ref}?email=book@example.com`)).body.booking.status).toBe("confirmed");
    expect((await api().post("/api/payments/mpesa/stk").send({ kind: "booking", reference: ref, email: "book@example.com" })).status).toBe(409);
    expect((await api().post(`/api/bookings/${ref}/cancel`).send({ email: "book@example.com" })).body.booking.status).toBe("cancelled");
  });
  it("lapsed unpaid holds free the slot", async () => {
    const d = openDate(5);
    const a = await api().post("/api/bookings").send({ ...body, date: d, time: "15:00" });
    run("UPDATE bookings SET expires_at='2000-01-01T00:00:00.000Z' WHERE reference=?", a.body.booking.reference);
    const av = await api().get(`/api/availability?date=${d}`);
    expect(av.body.slots.find((s: any) => s.time === "15:00").available).toBe(true);
    expect((await get<any>("SELECT status FROM bookings WHERE reference=?", a.body.booking.reference))!.status).toBe("expired");
  });
});

describe("orders", () => {
  const slug = "loc-butter-moisturizer"; // 1200 KSh
  const stockOf = async (s: string) => (await get<any>("SELECT stock FROM products WHERE slug=?", s))!.stock;

  it("prices from the DB, ignores client prices, reserves stock, adds delivery fee", async () => {
    const before = await stockOf(slug);
    const r = await api().post("/api/orders").send({ ...guest, method: "delivery", area: "rongai", address: "Rongai town, plot 5", payment: "mpesa", items: [{ productId: slug, quantity: 2, price: 1 }], total: 1 });
    expect(r.status).toBe(201);
    expect(r.body.order).toMatchObject({ subtotal: 2400, deliveryFee: 200, total: 2600, status: "pending_payment" });
    expect(await stockOf(slug)).toBe(before - 2);
    const ref = r.body.order.reference;
    const p = await api().post("/api/payments/mpesa/stk").send({ kind: "order", reference: ref, email: guest.email });
    expect(p.body.amount).toBe(2600);
    expect((await api().get(`/api/orders/${ref}?email=${guest.email}`)).body.order.status).toBe("paid");
  });
  it("collection has no delivery fee", async () => {
    const r = await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: slug, quantity: 1 }] });
    expect(r.body.order).toMatchObject({ deliveryFee: 0, total: 1200 });
  });
  it("rejects oversell, unknown products, bad delivery info, empty cart", async () => {
    const low = "light-hydrating-lotion"; // stock 5
    const over = await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: low, quantity: 6 }] });
    expect(over.status).toBe(409);
    expect(await stockOf(low)).toBe(5);
    expect((await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: "scalp-soothing-cream", quantity: 1 }] })).body.fields).toEqual({ "scalp-soothing-cream": "Out of stock" });
    expect((await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: "ghost", quantity: 1 }] })).status).toBe(409);
    expect((await api().post("/api/orders").send({ ...guest, method: "delivery", payment: "mpesa", items: [{ productId: low, quantity: 1 }] })).status).toBe(400);
    expect((await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [] })).status).toBe(400);
    expect((await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: low, quantity: -1 }] })).status).toBe(400);
  });
  it("concurrent orders cannot oversell the last units", async () => {
    const s = "light-hydrating-lotion"; // stock 5
    const results = await Promise.all(Array.from({ length: 4 }, () =>
      api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: s, quantity: 2 }] })));
    expect(results.filter((r) => r.status === 201).length).toBe(2);
    expect(stockOf(s)).toBe(1);
  });
  it("cancel and expiry restore stock", async () => {
    const s = "strong-hold-moulding-gel";
    const before = await stockOf(s);
    const a = await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: s, quantity: 3 }] });
    expect(await stockOf(s)).toBe(before - 3);
    await api().post(`/api/orders/${a.body.order.reference}/cancel`).send({ email: guest.email });
    expect(await stockOf(s)).toBe(before);
    const b = await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: s, quantity: 3 }] });
    await run("UPDATE orders SET expires_at='2000-01-01T00:00:00.000Z' WHERE reference=?", b.body.order.reference);
    await api().get("/api/products");
    expect(await stockOf(s)).toBe(before);
    expect((await api().post("/api/payments/mpesa/stk").send({ kind: "order", reference: b.body.order.reference, email: guest.email })).status).toBe(409);
  });
  it("signed-in users see their own orders/bookings in account", async () => {
    const l = await api().post("/api/auth/login").send({ email: customer.email, password: customer.password });
    const auth = { Authorization: `Bearer ${l.body.token}` };
    const o = await api().post("/api/orders").set(auth).send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: "loc-butter-moisturizer", quantity: 1 }] });
    expect((await api().get("/api/account/orders").set(auth)).body.map((x: any) => x.reference)).toContain(o.body.order.reference);
    expect((await api().get(`/api/orders/${o.body.order.reference}`).set(auth)).status).toBe(200);
    expect((await api().get("/api/account/orders")).status).toBe(401);
  });
});

describe("consultations & contact", () => {
  const png = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
  const fields = { fullName: "Consult Me", phone: "0712345678", condition: "Natural, no chemicals", length: "Short (2–5 cm)", locSize: "Small", installType: "Comb coils" };
  const post = (files: { buf: Buffer; name: string; type: string }[], f: Record<string, string> = fields) => {
    let r = api().post("/api/consultations");
    for (const [k, v] of Object.entries(f)) r = r.field(k, v);
    for (const x of files) r = r.attach("photos", x.buf, { filename: x.name, contentType: x.type });
    return r;
  };
  it("accepts a valid request with photos", async () => {
    const r = await post([{ buf: png, name: "a.png", type: "image/png" }]);
    expect(r.status).toBe(201);
    expect(r.body.consultation.photos).toBe(1);
  });
  it("rejects fake images, wrong types, too many files, missing fields", async () => {
    expect((await post([{ buf: Buffer.from("<?php evil ?>"), name: "x.png", type: "image/png" }])).status).toBe(400);
    expect((await post([{ buf: png, name: "x.gif", type: "image/gif" }])).status).toBe(400);
    expect((await post(Array.from({ length: 6 }, (_, i) => ({ buf: png, name: `${i}.png`, type: "image/png" })))).status).toBe(400);
    expect((await post([], { fullName: "A" })).status).toBe(400);
  });
  it("only admins can read photos", async () => {
    await run("INSERT INTO users (full_name,email,phone,password_hash,role,created_at) VALUES ('Boss','boss@example.com','', $1, 'admin', '2026-01-01') ON CONFLICT (email) DO NOTHING", bcrypt.hashSync("adminpassword1", 4));
    const t = (await api().post("/api/auth/login").send({ email: "boss@example.com", password: "adminpassword1" })).body.token;
    const list = (await api().get("/api/admin/consultations").set("Authorization", `Bearer ${t}`)).body;
    const photo = list.find((c: any) => c.photos.length).photos[0];
    expect((await api().get(photo.url)).status).toBe(401);
    const img = await api().get(photo.url).set("Authorization", `Bearer ${t}`);
    expect(img.status).toBe(200);
    expect(img.headers["content-type"]).toBe("image/png");
  });
  it("contact form validates, stores and swallows honeypot", async () => {
    const m = { name: "Visitor", email: "v@example.com", subject: "Hello", message: "I would like to know more." };
    expect((await api().post("/api/contact").send(m)).status).toBe(201);
    expect((await api().post("/api/contact").send({ ...m, message: "short" })).status).toBe(400);
    await api().post("/api/contact").send({ ...m, website: "http://spam" });
    expect((await get<any>("SELECT COUNT(*) n FROM contact_messages"))!.n).toBe(1);
  });
});

describe("admin", () => {
  it("manages order lifecycle and cancels restore stock", async () => {
    const t = (await api().post("/api/auth/login").send({ email: "boss@example.com", password: "adminpassword1" })).body.token;
    const auth = { Authorization: `Bearer ${t}` };
    const s = "wide-tooth-comb";
    const before = (await get<any>("SELECT stock FROM products WHERE slug=?", s)).stock;
    const o = await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items: [{ productId: s, quantity: 2 }] });
    const ref = o.body.order.reference;
    expect((await api().patch(`/api/admin/orders/${ref}`).set(auth).send({ status: "shipped" })).status).toBe(409); // unpaid
    await api().post("/api/payments/mpesa/stk").send({ kind: "order", reference: ref, email: guest.email });
    expect((await api().patch(`/api/admin/orders/${ref}`).set(auth).send({ status: "shipped" })).status).toBe(200);
    expect((await api().patch(`/api/admin/orders/${ref}`).set(auth).send({ status: "cancelled" })).status).toBe(200);
    expect((await get<any>("SELECT stock FROM products WHERE slug=?", s)).stock).toBe(before);
    expect((await api().get("/api/admin/summary").set(auth)).body.revenue).toBeGreaterThan(0);
    expect((await api().patch(`/api/admin/products/${s}`).set(auth).send({ stock: 99, price: 777 })).status).toBe(200);
    expect((await api().get(`/api/products/${s}`)).body).toMatchObject({ stock: 99, price: 777 });
  });
  it("unknown API routes 404 as JSON; health works", async () => {
    expect((await api().get("/api/nope")).body.error).toBe("Not found");
    expect((await api().get("/api/health")).body.ok).toBe(true);
    expect((await api().post("/api/contact").set("Content-Type", "application/json").send("{bad")).status).toBe(400);
  });
});
