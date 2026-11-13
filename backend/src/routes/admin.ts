import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { all, cancelOrderTx, get, run, tx } from "../db.js";
import { HttpError, notFound, asyncHandler } from "../lib/errors.js";
import { requireAdmin } from "../lib/auth.js";
import { bookingView } from "./bookings.js";
import { orderView } from "./orders.js";
import { nowIso, reference } from "../lib/util.js";

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
  res.json((await all("SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.slug=b.service_slug WHERE ($1::text IS NULL OR b.status=$2) ORDER BY b.date, b.time LIMIT $3 OFFSET $4", s, s, limit, offset)).map(bookingView));
});

adminRouter.patch("/admin/bookings/:reference", async (req, res) => {
  const { status: st } = z.object({ status: z.enum(["confirmed", "completed", "cancelled"]) }).parse(req.body);
  const b = await get<any>("SELECT id FROM bookings WHERE reference=$1", req.params.reference);
  if (!b) throw notFound("Booking");
  if (st === "confirmed") {
    const paid = await get<any>("SELECT 1 FROM payments WHERE kind='booking' AND target_id=$1 AND status='succeeded' LIMIT 1", b.id);
    if (!paid) throw new HttpError(409, "A booking can only be confirmed after a verified deposit payment", { status: "Payment not verified" });
  }
  if (st === "completed") {
    const confirmed = await get<any>("SELECT 1 FROM bookings WHERE id=$1 AND status='confirmed'", b.id);
    if (!confirmed) throw new HttpError(409, "Booking must be confirmed before marking as completed", { status: "Booking not confirmed" });
    const paymentSucceeded = await get<any>("SELECT 1 FROM payments WHERE kind='booking' AND target_id=$1 AND status='succeeded' LIMIT 1", b.id);
    if (!paymentSucceeded) throw new HttpError(409, "Payment must succeed before marking booking as completed", { status: "Payment not succeeded" });
  }
  try { await run("UPDATE bookings SET status=$1, expires_at=NULL WHERE id=$2", st, b.id); }
  catch { throw new HttpError(409, "That slot is now held by another booking"); }
  res.json({ ok: true });
});

adminRouter.post("/admin/bookings/:reference/cancellation-request", asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const b = await get<any>("SELECT id, status FROM bookings WHERE reference=$1", req.params.reference);
  if (!b) throw notFound("Booking");
  if (b.status === "cancelled") throw new HttpError(409, "Booking already cancelled");
  if (!["pending_deposit", "confirmed"].includes(b.status)) throw new HttpError(409, `Booking with status "${b.status}" cannot have cancellation request`);
  await run("INSERT INTO booking_cancellation_requests (booking_id, reason, status, created_at) VALUES ($1, $2, 'pending', $3)", b.id, reason, nowIso());
  res.json({ ok: true });
}));

adminRouter.get("/admin/bookings/:reference/cancellation-request", asyncHandler(async (req, res) => {
  const b = await get<any>("SELECT id FROM bookings WHERE reference=$1", req.params.reference);
  if (!b) throw notFound("Booking");
  const r = await get<any>("SELECT * FROM booking_cancellation_requests WHERE booking_id=$1 ORDER BY created_at DESC LIMIT 1", b.id);
  if (!r) throw new HttpError(404, "Cancellation request not found");
  res.json({ status: r.status, reason: r.reason, created_at: r.created_at });
}));

adminRouter.get("/admin/orders", asyncHandler(async (req, res) => {
  const s = status(req.query.status), { limit, offset } = page(req.query);
  const rows = await all("SELECT * FROM orders WHERE ($1::text IS NULL OR status=$2) ORDER BY id DESC LIMIT $3 OFFSET $4", s, s, limit, offset);
  res.json(await Promise.all(rows.map((o) => orderView(o))));
}));

adminRouter.patch("/admin/orders/:reference", asyncHandler(async (req, res) => {
  const { status: st } = z.object({ status: z.enum(["processing", "shipped", "delivered", "cancelled"]) }).parse(req.body);
  await tx(async (t$) => {
    const o = await t$.get<any>("SELECT id, status FROM orders WHERE reference=$1 FOR UPDATE", req.params.reference);
    if (!o) throw notFound("Order");
    if (["pending_payment", "expired"].includes(o.status)) throw new HttpError(409, "Order has not been paid");
    if (st === "cancelled") {
      await cancelOrderTx(t$, { id: o.id });
      return;
    }
    if (o.status === "cancelled") throw new HttpError(409, "A cancelled order cannot be changed");
    await t$.run("UPDATE orders SET status=$1 WHERE id=$2", st, o.id);
  });
  res.json({ ok: true });
}));

adminRouter.get("/admin/consultations", async (req, res) => {
  const s = status(req.query.status), { limit, offset } = page(req.query);
  const consultations = await all("SELECT * FROM consultations WHERE ($1::text IS NULL OR status=$2) ORDER BY id DESC LIMIT $3 OFFSET $4", s, s, limit, offset);
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

adminRouter.get("/admin/consultations/:reference/photos/:id", async (req, res) => {
  const p = await get<any>("SELECT p.id FROM consultation_photos p JOIN consultations c ON c.id=p.consultation_id WHERE c.reference=$1 AND p.id=$2", req.params.reference, Number(req.params.id));
  if (!p) throw notFound("Photo");
  res.json({ url: `/api/uploads/consultations/photos/${p.id}/content` });
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

adminRouter.patch("/admin/services/:slug", async (req, res) => {
  const b = z.object({ priceFrom: z.number().int().min(0).nullable() }).parse(req.body);
  const r = await run("UPDATE services SET price_from=$1 WHERE slug=$2", b.priceFrom, req.params.slug);
  if (r.rowCount === 0) throw notFound("Service");
  res.json({ ok: true });
});

// FIXED: TypeScript safe TikTok ID extractor
function tiktokVideoId(rawUrl: string): string | null {
  try {
    const urlStr = String(rawUrl);
    const cleanUrl = urlStr.split("?")[0] || "";
    const u = new URL(cleanUrl);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const m = u.pathname.match(new RegExp("(?:@[^/]+/)?video/(\\d+)"));
    
    if ((host === "tiktok.com" || host.endsWith(".tiktok.com")) && m) return m[1] ?? null;
    return null;
  } catch {
    return null;
  }
}

const tiktokSchema = z.object({
  url: z.string().min(1, "URL is required").max(500, "URL too long"),
  title: z.string().trim().max(200, "Title too long").default(""),
});

export const tiktokPublicRouter = Router();

tiktokPublicRouter.get("/tiktok/public", async (_req, res) => {
  const rows = await all<{ id: number; url: string; videoId: string; title: string; sortOrder: number; createdAt: string }>(
    "SELECT id,url,video_id AS videoId,title,sort_order AS sortOrder,created_at AS createdAt FROM tiktok_videos WHERE published=1 ORDER BY sort_order, id"
  );
  res.json(rows);
});

adminRouter.get("/admin/tiktok", async (_req, res) => {
  const rows = await all<{ id: number; url: string; videoId: string; title: string; published: boolean; sortOrder: number; createdAt: string; updatedAt: string }>(
    "SELECT id,url,video_id AS videoId,title,published=1 AS published,sort_order AS sortOrder,created_at AS createdAt,updated_at AS updatedAt FROM tiktok_videos ORDER BY published DESC, sort_order, id"
  );
  res.json(rows);
});

adminRouter.post("/admin/tiktok", asyncHandler(async (req, res) => {
  const b = tiktokSchema.parse(req.body);
  const videoId = tiktokVideoId(b.url);
  if (!videoId) {
    throw new HttpError(400, "Invalid TikTok URL", { 
      url: "Make sure it contains /video/ followed by numbers." 
    });
  }

  const exists = await get<any>("SELECT 1 FROM tiktok_videos WHERE video_id=$1", videoId);
  if (exists) throw new HttpError(409, "This TikTok video is already listed", { url: "Duplicate video" });

  const cleanUrl = String(b.url).split("?")[0] || "";

  const r = await run(
    "INSERT INTO tiktok_videos (url,video_id,title,published,sort_order,created_at,updated_at) VALUES ($1,$2,$3,0,COALESCE((SELECT MAX(sort_order) FROM tiktok_videos),-1) + 1,$4,$5) RETURNING id",
    cleanUrl, videoId, b.title, nowIso(), nowIso()
  );
  
  res.status(201).json({ id: Number(r.rows[0].id), videoId, title: b.title, published: false });
}));

adminRouter.patch("/admin/tiktok/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const b = z.object({
    url: z.string().min(1).optional(),
    title: z.string().trim().max(200).optional(),
    published: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional(),
  }).parse(req.body);
  const row = await get<any>("SELECT * FROM tiktok_videos WHERE id=$1", id);
  if (!row) throw notFound("TikTok video");
  let videoId = row.video_id;
  if (b.url) {
    const next = tiktokVideoId(b.url);
    if (!next) throw new HttpError(400, "Invalid TikTok URL", { url: "Expected a TikTok video URL" });
    if (next !== row.video_id) {
      const dup = await get<any>("SELECT 1 FROM tiktok_videos WHERE video_id=$1 AND id <> $2", next, id);
      if (dup) throw new HttpError(409, "This TikTok video is already listed", { url: "Duplicate video" });
    }
    videoId = next;
  }
  await run(
    "UPDATE tiktok_videos SET url=COALESCE($2,url), video_id=COALESCE($3,video_id), title=COALESCE($4,title), published=COALESCE($5::integer,published), sort_order=COALESCE($6,sort_order), updated_at=$7 WHERE id=$1",
    id, b.url ? (String(b.url).split("?")[0] || null) : null, videoId, b.title ?? null, b.published === undefined ? null : (b.published ? 1 : 0), b.sortOrder ?? null, nowIso()
  );
  res.json({ ok: true });
}));

adminRouter.delete("/admin/tiktok/:id", asyncHandler(async (req, res) => {
  const r = await run("DELETE FROM tiktok_videos WHERE id=$1", Number(req.params.id));
  if (r.rowCount === 0) throw notFound("TikTok video");
  res.json({ ok: true });
}));

// ---- Customers directory (read-only) -----------------------------------------------------------
adminRouter.get("/admin/customers", asyncHandler(async (req, res) => {
  const { limit, offset } = page(req.query);
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const like = q ? `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
  const rows = await all<any>(
    `SELECT u.id, u.full_name, u.email, u.phone, u.created_at,
            (SELECT COUNT(*) FROM bookings b WHERE b.user_id = u.id) AS bookings,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS orders,
            (SELECT COALESCE(SUM(o.total), 0) FROM orders o WHERE o.user_id = u.id AND o.status IN ('paid','processing','shipped','delivered')) AS spent
       FROM users u
      WHERE u.role = 'customer'
        AND ($1::text IS NULL OR u.full_name ILIKE $2 OR u.email ILIKE $2 OR u.phone ILIKE $2)
      ORDER BY u.id DESC
      LIMIT $3 OFFSET $4`,
    like, like, limit, offset,
  );
  res.json(rows.map((r) => ({
    id: Number(r.id),
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    createdAt: r.created_at,
    bookings: Number(r.bookings),
    orders: Number(r.orders),
    spent: Number(r.spent),
  })));
}));

// ---- Products ------------------------------------------------------------------

adminRouter.get("/admin/products", asyncHandler(async (req, res) => {
  const { limit, offset } = page(req.query);
  const q = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 200) : "";
  const like = q ? `%${q.replace(/[\\\\%_]/g, (c) => `\\\\${c}`)}%` : null;
  const statusFilter = req.query.status as string | undefined;
  
  const rows = await all<any>(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.slug = p.category
    WHERE ($1::text IS NULL OR p.name ILIKE $2 OR p.slug ILIKE $2 OR p.short_description ILIKE $2)
    AND ($3::text IS NULL OR p.status = $3)
    ORDER BY p.created_at DESC
    LIMIT $4 OFFSET $5`,
    like, like, statusFilter, limit, offset
  );
  
  res.json(rows.map((r) => ({
    id: Number(r.id) || undefined,
    slug: r.slug,
    name: r.name,
    category: r.category,
    category_name: r.category_name,
    category_slug: r.category_slug,
    shortDescription: r.short_description,
    description: r.description,
    price: r.price,
    stock: r.stock,
    images: typeof r.images === "string" ? JSON.parse(r.images) : (r.images ?? []),
    size: r.size,
    featured: r.featured === 1,
    status: r.status,
    low_stock_threshold: r.low_stock_threshold,
    created_at: r.created_at,
  })));
}));

adminRouter.post("/admin/products", asyncHandler(async (req, res) => {
  const body = z.object({
    name: z.string().min(1),
    slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    category: z.string().min(1),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    price: z.number().int().min(0),
    stock: z.number().int().min(0).default(0),
    size: z.string().optional(),
    status: z.enum(["draft", "active", "archived"]).default("draft"),
    low_stock_threshold: z.number().int().min(0).default(5),
    images: z.array(z.string()).optional(),
  }).parse(req.body);

  const cat = await get<any>("SELECT 1 FROM categories WHERE slug=$1", body.category);
  if (!cat) throw new HttpError(400, "Invalid category slug", { category: body.category });

  try {
    // Explicitly cast $11 to JSONB so Neon doesn't complain
    const r = await run(
      `INSERT INTO products (slug, name, category, short_description, description, price, stock, size, status, low_stock_threshold, images, featured, created_at, updated_at) 
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14) RETURNING *`,
      body.slug, body.name, body.category, body.shortDescription, body.description, body.price, body.stock, 
      body.size ?? null, body.status, body.low_stock_threshold, 
      body.images ? JSON.stringify(body.images) : "[]", 
      0, nowIso(), nowIso()
    );
    res.status(201).json({ ok: true, product: parseProductRow(r.rows[0]) });
  } catch (dbError: any) {
    console.error("DB Error creating product:", dbError.message);
    throw new HttpError(500, `Database error: ${dbError.message}`);
  }
}));

adminRouter.patch("/admin/products/:slug", asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  const body = z.object({
    price: z.number().int().min(0).optional(),
    stock: z.number().int().min(0).optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    low_stock_threshold: z.number().int().min(0).optional(),
  }).parse(req.body);

  const sets: string[] = [];
  const vals: any[] = [];
  let i = 1;

  if (body.price !== undefined) { sets.push(`price=$${i}`); vals.push(body.price); i++; }
  if (body.stock !== undefined) { sets.push(`stock=$${i}`); vals.push(body.stock); i++; }
  if (body.status !== undefined) { sets.push(`status=$${i}`); vals.push(body.status); i++; }
  if (body.low_stock_threshold !== undefined) { sets.push(`low_stock_threshold=$${i}`); vals.push(body.low_stock_threshold); i++; }

  if (sets.length === 0) return res.json({ ok: true, message: "No fields to update" });

  sets.push(`updated_at=$${i}`); vals.push(nowIso()); i++;
  
  vals.push(slug);
  await run(`UPDATE products SET ${sets.join(",")} WHERE slug=$${i}`, ...vals);
  res.json({ ok: true });
}));

adminRouter.patch("/admin/products/:slug/status", asyncHandler(async (req, res) => {
  const slug = req.params.slug;
  const { status } = z.object({ status: z.enum(["draft", "active", "archived"]) }).parse(req.body);
  const row = await get<any>("SELECT * FROM products WHERE slug=$1", slug);
  if (!row) throw notFound("Product");
  await run("UPDATE products SET status=$1, updated_at=$3 WHERE slug=$2", status, slug, nowIso());
  res.json({ ok: true, status });
}));

function parseProductRow(r: any) {
  return {
    id: Number(r.id),
    slug: r.slug,
    name: r.name,
    category: r.category,
    shortDescription: r.short_description,
    description: r.description,
    price: r.price,
    stock: r.stock,
    images: typeof r.images === "string" ? JSON.parse(r.images) : (r.images ?? []),
    size: r.size,
    featured: r.featured === 1,
    status: r.status,
    low_stock_threshold: r.low_stock_threshold,
  };
}