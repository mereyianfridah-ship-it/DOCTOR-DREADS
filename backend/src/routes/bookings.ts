import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { all, get, run, sweepExpired, tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { optionalAuth } from "../lib/auth.js";
import { email, fullName, phone } from "../lib/schemas.js";
import { addDays, dayOfWeek, isValidISODate, plusMinutesIso, reference, todayEAT, nowIso } from "../lib/util.js";
import { realStylists, site } from "../site.js";

export const bookingsRouter = Router();

function checkDate(date: string) {
  if (!isValidISODate(date)) throw new HttpError(400, "Date must be YYYY-MM-DD", { date: "Invalid date" });
  const today = todayEAT();
  if (date < addDays(today, 1) || date > addDays(today, site.booking.advanceDays))
    throw new HttpError(400, `Bookings open from tomorrow up to ${site.booking.advanceDays} days ahead`, { date: "Date out of range" });
}
const isOpen = (date: string) => site.booking.openDays.includes(dayOfWeek(date));

async function busyStylists(date: string, time: string): Promise<Set<string>> {
  const rows = await all<{ stylist_id: string }>("SELECT stylist_id FROM bookings WHERE date=$1 AND time=$2 AND status IN ('pending_deposit','confirmed')", date, time);
  return new Set(rows.map((r) => r.stylist_id));
}

/** GET /api/availability?date=YYYY-MM-DD&stylist=auto|stylist-a|... */
bookingsRouter.get("/availability", async (req, res) => {
  const q = z.object({ date: z.string(), stylist: z.string().default("auto") }).parse(req.query);
  checkDate(q.date);
  if (q.stylist !== "auto" && !realStylists.some((s) => s.id === q.stylist)) throw new HttpError(400, "Unknown stylist");
  await sweepExpired();
  const open = isOpen(q.date);
  const slots = await Promise.all(site.booking.slots.map(async (time) => {
    const busy = await busyStylists(q.date, time);
    const free = q.stylist === "auto" ? realStylists.some((s) => !busy.has(s.id)) : !busy.has(q.stylist);
    return { time, available: open && free };
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

  await sweepExpired();
  const created = await tx(async () => {
    const busy = await busyStylists(b.date, b.time);
    const stylist = b.stylist === "auto" ? realStylists.find((s) => !busy.has(s.id))?.id : busy.has(b.stylist) ? undefined : b.stylist;
    if (!stylist) throw new HttpError(409, "That time was just taken: please choose another slot", { time: "Slot unavailable" });
    const ref = reference("BK");
    const r = await run(`INSERT INTO bookings (reference,user_id,service_slug,location,date,time,stylist_id,full_name,phone,email,notes,deposit_amount,status,expires_at,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, 'pending_deposit', $13, $14) RETURNING id`,
      ref, req.user?.id ?? null, b.serviceSlug, b.location, b.date, b.time, stylist, b.fullName, b.phone, b.email, b.notes, deposit, plusMinutesIso(config.holdMinutes), nowIso());
    return ref;
  });
  res.status(201).json({ booking: view(await get(`${SELECT} WHERE b.reference=$1`, created)), payment: { amount: deposit, payUrl: "/api/payments/mpesa/stk" } });
}));

/** Guests look up with reference + email; signed-in owners (and admins) by reference alone. */
export async function findBooking(ref: string, req: { user?: any }, emailQ?: unknown) {
  const b = await get<any>(`${SELECT} WHERE b.reference=$1`, ref.toUpperCase());
  const allowed = b && (req.user?.role === "admin" || (req.user && b.user_id === req.user.id) || (typeof emailQ === "string" && emailQ.toLowerCase() === String(b.email).toLowerCase()));
  if (!allowed) throw notFound("Booking"); // identical response whether it exists or not
  return b;
}
bookingsRouter.get("/bookings/:reference", optionalAuth, async (req, res) => {
  await sweepExpired();
  res.json({ booking: view(await findBooking(req.params.reference, req, req.query.email)) });
});
bookingsRouter.post("/bookings/:reference/cancel", optionalAuth, async (req, res) => {
  const b = await findBooking(req.params.reference, req, req.body?.email);
  if (!["pending_deposit", "confirmed"].includes(b.status)) throw new HttpError(409, `A ${b.status} booking cannot be cancelled`);
  await run("UPDATE bookings SET status='cancelled' WHERE id=$1", b.id);
  res.json({ booking: view(await get(`${SELECT} WHERE b.id=$1`, b.id)), note: b.status === "confirmed" ? "Deposit refunds are handled by the salon." : undefined });
});
