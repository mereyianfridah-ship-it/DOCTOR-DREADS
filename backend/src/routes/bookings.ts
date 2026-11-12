import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { all, get, run, sweepExpired, tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { optionalAuth } from "../lib/auth.js";
import { email, fullName, phone } from "../lib/schemas.js";
import { addDays, addMinutesToHhmm, dayOfWeek, isValidISODate, overlaps, plusMinutesIso, reference, todayEAT, nowIso } from "../lib/util.js";
import { realStylists, site } from "../site.js";

export const bookingsRouter = Router();

function checkDate(date: string) {
  if (!isValidISODate(date)) throw new HttpError(400, "Date must be YYYY-MM-DD", { date: "Invalid date" });
  const today = todayEAT();
  if (date < addDays(today, 1) || date > addDays(today, site.booking.advanceDays))
    throw new HttpError(400, `Bookings open from tomorrow up to ${site.booking.advanceDays} days ahead`, { date: "Date out of range" });
}
const isOpen = (date: string) => site.booking.openDays.includes(dayOfWeek(date));

/** Active (holdable) bookings for a stylist on a date, with their time windows. */
async function stylistWindows(date: string): Promise<{ stylistId: string; start: string; end: string }[]> {
  const rows = await all<{ stylist_id: string; time: string; duration_minutes: number }>(
    `SELECT b.stylist_id, b.time, COALESCE(b.duration_minutes, (s.duration_minutes)::integer, 60) AS duration_minutes
     FROM bookings b JOIN services s ON s.slug = b.service_slug
     WHERE b.date=$1 AND b.status IN ('pending_deposit','confirmed')`,
    date
  );
  return rows.map((r) => ({ stylistId: r.stylist_id, start: r.time, end: addMinutesToHhmm(r.time, r.duration_minutes) }));
}

/** GET /api/availability?date=YYYY-MM-DD&stylist=auto|stylist-a|... */
bookingsRouter.get("/availability", async (req, res) => {
  const q = z.object({ date: z.string(), stylist: z.string().default("auto") }).parse(req.query);
  checkDate(q.date);
  if (q.stylist !== "auto" && !realStylists.some((s) => s.id === q.stylist)) throw new HttpError(400, "Unknown stylist");
  await sweepExpired();
  const open = isOpen(q.date);
  const windows = await stylistWindows(q.date);
  const byStylist = new Map<string, { start: string; end: string }[]>();
  for (const w of windows) {
    const list = byStylist.get(w.stylistId) ?? [];
    list.push(w);
    byStylist.set(w.stylistId, list);
  }
  const slotLength = 60; // site slots are one hour apart
  const slots = await Promise.all(site.booking.slots.map(async (time) => {
    const slotEnd = addMinutesToHhmm(time, slotLength);
    const free = (stylistId: string) => {
      const list = byStylist.get(stylistId) ?? [];
      return !list.some((w) => overlaps(time, slotEnd, w.start, w.end));
    };
    let available: boolean;
    if (q.stylist === "auto") available = realStylists.some((s) => free(s.id));
    else available = free(q.stylist);
    return { time, available: open && available };
  }));
  res.json({ date: q.date, open, slots });
});

const bookingSchema = z.object({
  serviceSlug: z.string().min(1),
  location: z.enum(["salon", "mobile"]),
  date: z.string(),
  time: z.string(),
  stylist: z.string().default("auto"),
  fullName, phone, email,
  notes: z.string().trim().max(500, "Please keep notes under 500 characters").default(""),
});

const view = (b: any) => ({
  reference: b.reference, service: b.service_name ?? undefined, serviceSlug: b.service_slug, location: b.location, date: b.date, time: b.time,
  stylistId: b.stylist_id, fullName: b.full_name, phone: b.phone, email: b.email, notes: b.notes,
  depositAmount: b.deposit_amount, status: b.status, expiresAt: b.status === "pending_deposit" ? b.expires_at : null, createdAt: b.created_at,
});
export const bookingView = view;
const SELECT = "SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.slug=b.service_slug";

bookingsRouter.post("/bookings", optionalAuth, asyncHandler(async (req, res) => {
  const b = bookingSchema.parse(req.body);
  checkDate(b.date);
  if (!isOpen(b.date)) throw new HttpError(400, "The salon is closed on that day", { date: "Closed on this day" });
  if (!site.booking.slots.includes(b.time)) throw new HttpError(400, "Invalid time slot", { time: "Invalid time slot" });
  if (b.stylist !== "auto" && !realStylists.some((s) => s.id === b.stylist)) throw new HttpError(400, "Unknown stylist", { stylist: "Unknown stylist" });
  const svc = await get<any>("SELECT * FROM services WHERE slug=$1", b.serviceSlug);
  if (!svc) throw notFound("Service");
  if (svc.booking_type !== "instant" || svc.price_from == null)
    throw new HttpError(400, "This service starts with a consultation: please use /api/consultations", { serviceSlug: "Consultation required" });
  const deposit = Math.round((svc.price_from * site.booking.depositPercent) / 100);
  const durationMinutes = Number(svc.duration_minutes ?? 60);
  const start = b.time;
  const end = addMinutesToHhmm(start, durationMinutes);

  await sweepExpired();
  const created = await tx(async (t$) => {
    // Serialize concurrent booking requests for the same date + stylist. Locks are taken
    // in a fixed, global stylist order so two transactions can never deadlock.
    const candidates = b.stylist === "auto" ? realStylists : realStylists.filter((s) => s.id === b.stylist);
    for (const s of candidates) await t$.run("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", `booking:${b.date}`, s.id);

    const windows = await stylistWindows(b.date);
    const byStylist = new Map<string, { start: string; end: string }[]>();
    for (const w of windows) {
      const list = byStylist.get(w.stylistId) ?? [];
      list.push(w);
      byStylist.set(w.stylistId, list);
    }
    const free = (stylistId: string) => !(byStylist.get(stylistId) ?? []).some((w) => overlaps(start, end, w.start, w.end));

    let stylist: string | undefined;
    for (const s of candidates) {
      if (free(s.id)) { stylist = s.id; break; }
    }
    if (!stylist) throw new HttpError(409, "That time was just taken: please choose another slot", { time: "Slot unavailable" });

    const ref = reference("BK");
    const r = await t$.run(`INSERT INTO bookings (reference,user_id,service_slug,location,date,time,stylist_id,full_name,phone,email,notes,deposit_amount,duration_minutes,status,expires_at,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, 'pending_deposit', $14, $15) RETURNING id`,
      ref, req.user?.id ?? null, b.serviceSlug, b.location, b.date, b.time, stylist, b.fullName, b.phone, b.email, b.notes, deposit, durationMinutes, plusMinutesIso(config.holdMinutes), nowIso());
    return ref;
  });
  res.status(201).json({ booking: view(await get(`${SELECT} WHERE b.reference=$1`, created)), payment: { amount: deposit, payUrl: "/api/payments/mpesa/stk" } });
}));

/** POST /api/bookings/:reference/cancel */
bookingsRouter.post("/bookings/:reference/cancel", optionalAuth, asyncHandler(async (req, res) => {
  const b = await findBooking(req.params.reference, req, req.body?.email);
  if (!b) return; // already handled by findBooking

  // Only pending_deposit and confirmed bookings can be cancelled.
  // Use a transaction with row lock to prevent race conditions.
  await tx(async (t$) => {
    // Re-fetch the booking under a row lock to re-read the status atomically.
    const refreshed = await t$.get<{ id: number; status: string }>(
      "SELECT id, status FROM bookings WHERE id=$1 FOR UPDATE",
      b.id
    );
    if (!refreshed) throw new HttpError(404, "Booking not found");
    if (refreshed.status === "cancelled") return; // already cancelled – no-op

    // Re-check allowed statuses inside the transaction.
    if (!["pending_deposit", "confirmed"].includes(refreshed.status)) {
      throw new HttpError(409, `A ${refreshed.status} booking cannot be cancelled`);
    }

    // Update status to cancelled.
    await t$.run("UPDATE bookings SET status='cancelled' WHERE id=$1", refreshed.id);
  });

  res.json({ booking: view(await get(`${SELECT} WHERE b.id=$1`, b.id)), note: b.status === "confirmed" ? "Deposit refunds are handled by the salon." : undefined });
}));
