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

/* ---------------- admin orders list + transactional order cancellation ---------------- */

describe("admin orders list & order cancellation (transactional)", () => {
  const A = "zz-cancel-a", B = "zz-cancel-b", C = "zz-cancel-c"; // C carries the failure trigger in rollback tests
  const stockOf = async (s: string) => Number((await get<any>("SELECT stock FROM products WHERE slug=$1", s))!.stock);
  const statusOf = async (ref: string) => (await get<any>("SELECT status FROM orders WHERE reference=$1", ref))!.status as string;
  let auth: Record<string, string>;

  const place = async (items: { productId: string; quantity: number }[]) => {
    const r = await api().post("/api/orders").send({ ...guest, method: "collection", payment: "mpesa", items });
    expect(r.status).toBe(201);
    return r.body.order.reference as string;
  };
  const pay = async (ref: string) => {
    await api().post("/api/payments/mpesa/stk").send({ kind: "order", reference: ref, email: guest.email });
    expect(await statusOf(ref)).toBe("paid");
  };
  const adminSet = (ref: string, status: string) => api().patch(`/api/admin/orders/${ref}`).set(auth).send({ status });
  const customerCancel = (ref: string) => api().post(`/api/orders/${ref}/cancel`).send({ email: guest.email });

  const installFailingStockTrigger = async () => {
    await run("CREATE OR REPLACE FUNCTION zz_fail_stock_restore() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'simulated stock restore failure'; END; $$ LANGUAGE plpgsql");
    await run("DROP TRIGGER IF EXISTS zz_fail_restore ON products");
    await run("CREATE TRIGGER zz_fail_restore BEFORE UPDATE ON products FOR EACH ROW WHEN (NEW.slug = 'zz-cancel-c') EXECUTE FUNCTION zz_fail_stock_restore()");
  };
  const removeFailingStockTrigger = async () => { await run("DROP TRIGGER IF EXISTS zz_fail_restore ON products"); };

  beforeAll(async () => {
    await run("INSERT INTO users (full_name,email,phone,password_hash,role,created_at) VALUES ('Boss','boss@example.com','', $1, 'admin', '2026-01-01') ON CONFLICT (email) DO NOTHING", bcrypt.hashSync("adminpassword1", 4));
    const t = (await api().post("/api/auth/login").send({ email: "boss@example.com", password: "adminpassword1" })).body.token;
    auth = { Authorization: `Bearer ${t}` };
    await removeFailingStockTrigger();
    await run("DELETE FROM products WHERE slug = ANY($1::text[])", [A, B, C]); // only fails if leftover orders reference them
    for (const s of [A, B, C]) {
      await run("INSERT INTO products (slug,name,category,short_description,description,price,stock,images,size) VALUES ($1,$2,'Test','t','t',500,10,'[]','1') ON CONFLICT (slug) DO UPDATE SET stock=10", s, `Test ${s}`);
    }
  });

  it("GET /admin/orders resolves every order's items before responding (and keeps the response shape)", async () => {
    const r1 = await place([{ productId: A, quantity: 1 }, { productId: B, quantity: 2 }]);
    const r2 = await place([{ productId: B, quantity: 1 }]);
    await pay(r2);

    const res = await api().get("/api/admin/orders").set(auth);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const o of res.body) {
      // Before the fix each element was a serialised Promise, i.e. `{}`.
      expect(Object.keys(o)).toEqual(expect.arrayContaining(["reference", "name", "phone", "email", "method", "subtotal", "deliveryFee", "total", "paymentMethod", "status", "expiresAt", "createdAt", "items"]));
      expect(Array.isArray(o.items)).toBe(true);
      expect(o.items.length).toBeGreaterThan(0);
    }
    const o1 = res.body.find((o: any) => o.reference === r1);
    expect(o1).toMatchObject({ status: "pending_payment", subtotal: 1500, total: 1500 });
    expect(o1.items).toHaveLength(2);
    expect(o1.items).toEqual(expect.arrayContaining([
      { productId: A, name: `Test ${A}`, unitPrice: 500, quantity: 1 },
      { productId: B, name: `Test ${B}`, unitPrice: 500, quantity: 2 },
    ]));
    expect(res.body.find((o: any) => o.reference === r2)).toMatchObject({ status: "paid", expiresAt: null, items: [{ productId: B, quantity: 1 }] });

    const paid = await api().get("/api/admin/orders?status=paid").set(auth);
    expect(paid.body.length).toBeGreaterThan(0);
    expect(paid.body.every((o: any) => o.status === "paid" && o.items.length > 0)).toBe(true);
    expect((await api().get("/api/admin/orders?limit=1").set(auth)).body).toHaveLength(1);
    expect((await api().get("/api/admin/orders")).status).toBe(401);
  });

  it("admin cancel restores stock once; repeated and concurrent cancels do not restore again", async () => {
    const before = await stockOf(A);
    const ref = await place([{ productId: A, quantity: 3 }]);
    await pay(ref);
    expect(await stockOf(A)).toBe(before - 3);

    expect((await adminSet(ref, "cancelled")).body).toEqual({ ok: true });
    expect(await statusOf(ref)).toBe("cancelled");
    expect(await stockOf(A)).toBe(before);

    for (let i = 0; i < 2; i++) expect((await adminSet(ref, "cancelled")).status).toBe(200); // repeated: harmless no-op
    expect(await stockOf(A)).toBe(before); // not before + 3, not before + 6

    const ref2 = await place([{ productId: A, quantity: 2 }]);
    await pay(ref2);
    const results = await Promise.all([1, 2, 3].map(() => adminSet(ref2, "cancelled")));
    expect(results.every((r) => r.status === 200)).toBe(true);
    expect(await stockOf(A)).toBe(before);
  });

  it("a cancelled order cannot be re-opened (that would allow its stock to be restored twice)", async () => {
    const before = await stockOf(A);
    const ref = await place([{ productId: A, quantity: 1 }]);
    await pay(ref);
    await adminSet(ref, "cancelled");
    expect((await adminSet(ref, "processing")).status).toBe(409);
    expect(await statusOf(ref)).toBe("cancelled");
    expect(await stockOf(A)).toBe(before);
  });

  it("admin PATCH: unknown order is 404, unpaid order is 409 and keeps its reserved stock", async () => {
    expect((await adminSet("ORD-DOES-NOT-EXIST", "cancelled")).status).toBe(404);
    const before = await stockOf(B);
    const ref = await place([{ productId: B, quantity: 2 }]);
    expect((await adminSet(ref, "cancelled")).status).toBe(409);
    expect(await statusOf(ref)).toBe("pending_payment");
    expect(await stockOf(B)).toBe(before - 2);
    await customerCancel(ref); // tidy up
    expect(await stockOf(B)).toBe(before);
  });

  it("customer cancel restores stock once; repeated and concurrent cancels get 409 and restore nothing more", async () => {
    const before = await stockOf(B);
    const ref = await place([{ productId: B, quantity: 2 }]);
    expect(await stockOf(B)).toBe(before - 2);

    const first = await customerCancel(ref);
    expect(first.status).toBe(200);
    expect(first.body.order).toMatchObject({ reference: ref, status: "cancelled" });
    expect(await stockOf(B)).toBe(before);

    expect((await customerCancel(ref)).status).toBe(409);
    expect(await stockOf(B)).toBe(before);

    const ref2 = await place([{ productId: B, quantity: 3 }]);
    const results = await Promise.all([1, 2, 3].map(() => customerCancel(ref2)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(await stockOf(B)).toBe(before);
  });

  it("admin cancel rolls back the status change and ALL stock restores when a restore fails", async () => {
    const ref = await place([{ productId: A, quantity: 1 }, { productId: C, quantity: 1 }]); // A restores first, then C fails
    await pay(ref);
    expect((await adminSet(ref, "shipped")).status).toBe(200);
    const [a0, c0] = [await stockOf(A), await stockOf(C)];

    await installFailingStockTrigger();
    try {
      const failed = await adminSet(ref, "cancelled");
      expect(failed.status).toBe(500);
      expect(failed.body).toEqual({ error: "Internal server error" });
      expect(await statusOf(ref)).toBe("shipped"); // status change rolled back
      expect(await stockOf(A)).toBe(a0);           // A's already-executed restore rolled back too
      expect(await stockOf(C)).toBe(c0);
    } finally {
      await removeFailingStockTrigger();
    }

    expect((await adminSet(ref, "cancelled")).status).toBe(200); // a clean retry succeeds, exactly once
    expect(await statusOf(ref)).toBe("cancelled");
    expect(await stockOf(A)).toBe(a0 + 1);
    expect(await stockOf(C)).toBe(c0 + 1);
  });

  it("customer cancel rolls back the status change and ALL stock restores when a restore fails", async () => {
    const ref = await place([{ productId: A, quantity: 1 }, { productId: C, quantity: 1 }]);
    const [a0, c0] = [await stockOf(A), await stockOf(C)];

    await installFailingStockTrigger();
    try {
      expect((await customerCancel(ref)).status).toBe(500);
      expect(await statusOf(ref)).toBe("pending_payment");
      expect(await stockOf(A)).toBe(a0);
      expect(await stockOf(C)).toBe(c0);
    } finally {
      await removeFailingStockTrigger();
    }

    expect((await customerCancel(ref)).status).toBe(200);
    expect(await stockOf(A)).toBe(a0 + 1);
    expect(await stockOf(C)).toBe(c0 + 1);
  });
});