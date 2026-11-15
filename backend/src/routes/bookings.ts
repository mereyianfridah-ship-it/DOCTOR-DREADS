import { Router } from "express";
import { z } from "zod";
import { config } from "../config.js";
import { all, get, run, sweepExpired, tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { optionalAuth } from "../lib/auth.js";
import { email, fullName, phone } from "../lib/schemas.js";
import { addDays, addMinutesToHhmm, dayOfWeek, isValidISODate, overlaps, overlapsWithDuration, plusMinutesIso, reference, todayEAT, nowIso } from "../lib/util.js";
import { site } from "../site.js";
import { activeStylists } from "../lib/stylists.js";
import { loadRules } from "../lib/closureStore.js";
import { blockingClosure, dayState, partialWindows, salonClosedReason, stylistOffReason } from "../lib/closures.js";
import { rescheduleEligibility } from "../lib/reschedule.js";
import { sendMail } from "../lib/mailer.js";

export const bookingsRouter = Router();

function checkDate(date: string) {
  if (!isValidISODate(date)) throw new HttpError(400, "Date must be YYYY-MM-DD", { date: "Invalid date" });
  const today = todayEAT();
  if (date < addDays(today, 1) || date > addDays(today, site.booking.advanceDays))
    throw new HttpError(400, `Bookings open from tomorrow up to ${site.booking.advanceDays} days ahead`, { date: "Date out of range" });
}
const isOpen = (date: string) => site.booking.openDays.includes(dayOfWeek(date));

interface Window { id: number; stylistId: string; start: string; duration: number }

async function stylistWindows(date: string, exceptBookingId?: number): Promise<Window[]> {
  const rows = await all<{ id: number; stylist_id: string; time: string; duration_minutes: number }>(
    `SELECT b.id, b.stylist_id, b.time, COALESCE(b.duration_minutes, (s.duration_minutes)::integer, 60) AS duration_minutes
     FROM bookings b JOIN services s ON s.slug = b.service_slug
     WHERE b.date=$1 AND b.status IN ('pending_deposit','confirmed') AND ($2::int IS NULL OR b.id <> $2)`,
    date, exceptBookingId ?? null
  );
  return rows.map((r) => ({ id: r.id, stylistId: r.stylist_id, start: r.time, duration: Number(r.duration_minutes) }));
}

/** True when `stylistId` has no active booking overlapping [start, start+duration). */
export function stylistIsFree(windows: Window[], stylistId: string, start: string, duration: number): boolean {
  return !windows.some((w) => w.stylistId === stylistId && overlapsWithDuration(start, duration, w.start, w.duration));
}

bookingsRouter.get("/availability", async (req, res) => {
  const q = z.object({ date: z.string(), stylist: z.string().default("auto") }).parse(req.query);
  checkDate(q.date);
  const realStylists = await activeStylists();
  if (q.stylist !== "auto" && !realStylists.some((s) => s.id === q.stylist)) throw new HttpError(400, "Unknown stylist");
  await sweepExpired();
  const rules = await loadRules();
  const closed = salonClosedReason(rules, q.date);
  const open = isOpen(q.date) && closed === null;
  const windows = await stylistWindows(q.date);
  const slotLength = 60;
  const ids = q.stylist === "auto" ? realStylists.map((s) => s.id) : [q.stylist];
  const slots = site.booking.slots.map((time) => {
    const available = ids.some((id) => stylistIsFree(windows, id, time, slotLength) && blockingClosure(rules, q.date, id, time, slotLength) === null);
    return { time, available: open && available };
  });
  const off = q.stylist === "auto" ? null : stylistOffReason(rules, q.date, q.stylist);
  res.json({
    date: q.date, open, ...(closed !== null ? { closedReason: closed } : {}),
    ...(off !== null ? { stylistOff: true, stylistOffReason: off } : {}),
    // Part-day closures (salon-wide, plus the chosen stylist's own) so the page can explain greyed-out times.
    closedWindows: [...partialWindows(rules, q.date, null), ...(q.stylist === "auto" ? [] : partialWindows(rules, q.date, q.stylist))],
    slots,
  });
});

/**
 * Dates in [from, to] that are closed or partly closed, for greying out the date picker.
 * With stylist=auto a date only counts as closed when the salon is closed or every active stylist is off.
 */
bookingsRouter.get("/closures", async (req, res) => {
  const q = z.object({ from: z.string(), to: z.string(), stylist: z.string().default("auto") }).parse(req.query);
  if (!isValidISODate(q.from) || !isValidISODate(q.to)) throw new HttpError(400, "Dates must be YYYY-MM-DD");
  const today = todayEAT();
  const from = q.from < today ? today : q.from;
  const to = q.to > addDays(today, 400) ? addDays(today, 400) : q.to;
  const real = await activeStylists();
  if (q.stylist !== "auto" && !real.some((s) => s.id === q.stylist)) throw new HttpError(400, "Unknown stylist");
  const ids = q.stylist === "auto" ? real.map((s) => s.id) : [q.stylist];
  const rules = await loadRules();
  const dates: { date: string; kind: "closed" | "partial"; reason: string; windows?: { from: string; to: string; reason: string }[] }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const st = dayState(rules, d, ids);
    if (st.state === "closed") dates.push({ date: d, kind: "closed", reason: st.reason });
    else if (st.state === "partial") dates.push({ date: d, kind: "partial", reason: st.windows[0]?.reason ?? "", windows: st.windows });
  }
  res.set("Cache-Control", "public, max-age=30");
  res.json({ dates });
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
  rescheduleCount: Number(b.reschedule_count ?? 0),
  ...(() => { const e = rescheduleEligibility(b, config.reschedule); return { canReschedule: e.allowed, rescheduleBlockedReason: e.reason }; })(),
});
export const bookingView = view;
const SELECT = "SELECT b.*, s.name AS service_name FROM bookings b JOIN services s ON s.slug=b.service_slug";

export async function findBooking(reference: string, req: any, emailQ?: unknown) {
  const b = await get<any>("SELECT * FROM bookings WHERE reference=$1", reference.toUpperCase());
  const allowed = b && (req.user?.role === "admin" || (req.user && b.user_id === req.user.id) || (typeof emailQ === "string" && emailQ.toLowerCase() === String(b.email).toLowerCase()));
  if (!allowed) throw notFound("Booking");
  return b;
}

// ADDED: The missing GET route
bookingsRouter.get("/bookings/:reference", optionalAuth, asyncHandler(async (req, res) => {
  const reference = req.params.reference;
  if (!reference) return res.status(400).json({ error: "Missing reference" });

  const b = await findBooking(reference, req, req.query.email as string | undefined);
  res.json({ booking: view(b) });
}));

bookingsRouter.post("/bookings", optionalAuth, asyncHandler(async (req, res) => {
  const b = bookingSchema.parse(req.body);
  checkDate(b.date);
  const rules = await loadRules();
  if (!isOpen(b.date) || salonClosedReason(rules, b.date) !== null) throw new HttpError(400, "The salon is closed on that day", { date: "Closed on this day" });
  if (!site.booking.slots.includes(b.time)) throw new HttpError(400, "Invalid time slot", { time: "Invalid time slot" });
  const realStylists = await activeStylists();
  if (realStylists.length === 0) throw new HttpError(409, "Online booking is paused right now: please contact the salon");
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
    const candidates = b.stylist === "auto" ? realStylists : realStylists.filter((s) => s.id === b.stylist);
    for (const s of candidates) await t$.run("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", `booking:${b.date}`, s.id);

    const windows = await stylistWindows(b.date);
    const onShift = (stylistId: string) => blockingClosure(rules, b.date, stylistId, start, durationMinutes) === null;
    const free = (stylistId: string) => onShift(stylistId) && stylistIsFree(windows, stylistId, start, durationMinutes);

    let stylist: string | undefined;
    for (const s of candidates) {
      if (free(s.id)) { stylist = s.id; break; }
    }
    if (!stylist && candidates.length > 0 && candidates.every((s) => !onShift(s.id)))
      throw new HttpError(409, "That stylist isn't working at that time: please choose another time or stylist", { time: "Slot unavailable" });
    if (!stylist) throw new HttpError(409, "That time was just taken: please choose another slot", { time: "Slot unavailable" });

    const ref = reference("BK");
    const r = await t$.run(`INSERT INTO bookings (reference,user_id,service_slug,location,date,time,stylist_id,full_name,phone,email,notes,deposit_amount,duration_minutes,status,expires_at,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, 'pending_deposit', $14, $15) RETURNING id`,
      ref, req.user?.id ?? null, b.serviceSlug, b.location, b.date, b.time, stylist, b.fullName, b.phone, b.email, b.notes, deposit, durationMinutes, plusMinutesIso(config.holdMinutes), nowIso());
    return ref;
  });
  res.status(201).json({ booking: view(await get(`${SELECT} WHERE b.reference=$1`, created)), payment: { amount: deposit, payUrl: "/api/payments/mpesa/stk" } });
}));

bookingsRouter.post("/bookings/:reference/cancel", optionalAuth, asyncHandler(async (req, res) => {
  const reference = req.params.reference;
  if (!reference) return res.status(400).json({ error: "Missing reference" });
  
  const b = await findBooking(reference, req, req.body?.email);
  if (!b) return;

  await tx(async (t$) => {
    const refreshed = await t$.get<{ id: number; status: string }>(
      "SELECT id, status FROM bookings WHERE id=$1 FOR UPDATE",
      b.id
    );
    if (!refreshed) throw new HttpError(404, "Booking not found");
    if (refreshed.status === "cancelled") return;

    if (!["pending_deposit", "confirmed"].includes(refreshed.status)) {
      throw new HttpError(409, `A ${refreshed.status} booking cannot be cancelled`);
    }

    await t$.run("UPDATE bookings SET status='cancelled' WHERE id=$1", refreshed.id);
  });

  res.json({ booking: view(await get(`${SELECT} WHERE b.id=$1`, b.id)), note: b.status === "confirmed" ? "Deposit refunds are handled by the salon." : undefined });
}));

const rescheduleSchema = z.object({
  email: z.string().optional(),
  date: z.string(),
  time: z.string(),
  /** "same" keeps the current stylist, "auto" takes whoever is free, or a stylist id. */
  stylist: z.string().default("same"),
});

bookingsRouter.post("/bookings/:reference/reschedule", optionalAuth, asyncHandler(async (req, res) => {
  const body = rescheduleSchema.parse(req.body);
  const found = await findBooking(String(req.params.reference), req, body.email);

  checkDate(body.date);
  const rules = await loadRules();
  if (!isOpen(body.date) || salonClosedReason(rules, body.date) !== null) throw new HttpError(400, "The salon is closed on that day", { date: "Closed on this day" });
  if (!site.booking.slots.includes(body.time)) throw new HttpError(400, "Invalid time slot", { time: "Invalid time slot" });
  const realStylists = await activeStylists();
  if (!["same", "auto"].includes(body.stylist) && !realStylists.some((s) => s.id === body.stylist)) throw new HttpError(400, "Unknown stylist", { stylist: "Unknown stylist" });

  await sweepExpired();
  let previous = "";
  try {
    await tx(async (t$) => {
      const cur = await t$.get<any>("SELECT * FROM bookings WHERE id=$1 FOR UPDATE", found.id);
      if (!cur) throw notFound("Booking");
      const eligibility = rescheduleEligibility(cur, config.reschedule);
      if (!eligibility.allowed) throw new HttpError(409, eligibility.reason ?? "This booking can't be rescheduled");

      const candidates = body.stylist === "same" ? [cur.stylist_id] : body.stylist === "auto" ? realStylists.map((s) => s.id) : [body.stylist];
      if (cur.date === body.date && cur.time === body.time && candidates.includes(cur.stylist_id))
        throw new HttpError(400, "That is your current appointment time", { time: "Choose a different time" });

      // Same lock the booking flow takes, so a reschedule and a new booking can't both claim a slot.
      for (const id of candidates) await t$.run("SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))", `booking:${body.date}`, id);
      const windows = await stylistWindows(body.date, cur.id); // ignore this booking's own old slot
      const duration = Number(cur.duration_minutes ?? 60);
      const onShift = (id: string) => blockingClosure(rules, body.date, id, body.time, duration) === null;
      const stylist = candidates.find((id) => onShift(id) && stylistIsFree(windows, id, body.time, duration));
      if (!stylist && candidates.length > 0 && candidates.every((id) => !onShift(id)))
        throw new HttpError(409, "That stylist isn't working at that time: please choose another time or stylist", { time: "Slot unavailable" });
      if (!stylist) throw new HttpError(409, "That time isn't available: please choose another slot", { time: "Slot unavailable" });

      previous = `${cur.date} ${cur.time}`;
      await t$.run(
        "UPDATE bookings SET date=$1, time=$2, stylist_id=$3, reschedule_count=reschedule_count+1, rescheduled_from=$4, rescheduled_at=$5 WHERE id=$6",
        body.date, body.time, stylist, previous, nowIso(), cur.id,
      );
    });
  } catch (e: any) {
    // The unique index is the last line of defence against a double booking.
    if (e?.code === "23505") throw new HttpError(409, "That time was just taken: please choose another slot", { time: "Slot unavailable" });
    throw e;
  }

  const updated = await get<any>(`${SELECT} WHERE b.id=$1`, found.id);
  void sendMail({
    to: updated.email,
    subject: `Your Dr Dread Kenya appointment ${updated.reference} was rescheduled`,
    text: `Hi ${String(updated.full_name).split(" ")[0]},\n\nYour appointment (${updated.service_name}) has moved from ${previous} to ${updated.date} at ${updated.time}.\n\nReference: ${updated.reference}\nIf you didn't make this change, please contact the salon straight away.`,
  }).catch(() => undefined);
  res.json({
    booking: view(updated),
    note: updated.status === "pending_deposit" ? "Your hold time has not been extended: the deposit is still needed before it ends." : undefined,
  });
}));
