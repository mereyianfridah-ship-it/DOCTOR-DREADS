import { Router } from "express";
import { z } from "zod";
import { all, get, run, tx } from "../db.js";
import { asyncHandler, HttpError, notFound } from "../lib/errors.js";
import { requireAdmin } from "../lib/auth.js";
import { BusinessValidationError, parseBusiness, publicBusiness, type BusinessSettings } from "../lib/business.js";
import { loadBusiness } from "../lib/businessStore.js";
import { markStylistsManaged, RESERVED_STYLIST_IDS, slugifyName, stylistsManaged } from "../lib/stylists.js";
import { realStylists } from "../site.js";
import { isValidISODate, nowIso, todayEAT } from "../lib/util.js";
import { activeStylists } from "../lib/stylists.js";
import { loadStoredRules, rowToRule } from "../lib/closureStore.js";
import { countAffected, describeRule, parseRuleInput } from "../lib/closures.js";

export const settingsRouter = Router();
settingsRouter.use("/admin", requireAdmin);

// ---- business details ---------------------------------------------------------------------------

/** Public: contact details, opening hours and social links shown in the footer and on the Contact page. */
settingsRouter.get("/business", asyncHandler(async (_req, res) => {
  res.set("Cache-Control", "public, max-age=60");
  res.json(publicBusiness(await loadBusiness()));
}));

settingsRouter.get("/admin/business", asyncHandler(async (_req, res) => res.json(await loadBusiness())));

settingsRouter.put("/admin/business", asyncHandler(async (req, res) => {
  let b: BusinessSettings;
  try { b = parseBusiness(req.body); }
  catch (e) {
    if (e instanceof BusinessValidationError) throw new HttpError(400, e.message, e.fields);
    throw e;
  }
  await run(
    "INSERT INTO app_settings (key,value,updated_at) VALUES ('business',$1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=EXCLUDED.updated_at",
    JSON.stringify(b), nowIso(),
  );
  res.json(b);
}));

// ---- stylists -----------------------------------------------------------------------------------

const upcoming = (id: string) =>
  get<{ n: string }>(
    "SELECT COUNT(*) AS n FROM bookings WHERE stylist_id=$1 AND status IN ('pending_deposit','confirmed') AND date >= $2",
    id, todayEAT(),
  ).then((r) => Number(r?.n ?? 0));

settingsRouter.get("/admin/stylists", asyncHandler(async (_req, res) => {
  const managed = await stylistsManaged();
  const rows = managed
    ? await all<{ id: string; name: string; note: string; active: number }>("SELECT id,name,note,active FROM stylists ORDER BY sort, created_at, id")
    : realStylists.map((s) => ({ ...s, active: 1 }));
  const stylists = await Promise.all(rows.map(async (s) => ({ id: s.id, name: s.name, note: s.note, active: !!s.active, upcomingBookings: await upcoming(s.id) })));
  res.json({ managed, stylists });
}));

const nameSchema = z.string().trim().min(2, "Enter the stylist's name").max(60);
const noteSchema = z.string().trim().max(160);

settingsRouter.post("/admin/stylists", asyncHandler(async (req, res) => {
  const body = z.object({ name: nameSchema, note: noteSchema.default("") }).parse(req.body);
  const created = await tx(async (t$) => {
    await markStylistsManaged((sql, ...p) => t$.run(sql, ...p)); // first stylist replaces the demo ones
    await t$.run("SELECT pg_advisory_xact_lock(hashtext('stylists'))");
    const base = slugifyName(body.name);
    let id = base, n = 1;
    while (RESERVED_STYLIST_IDS.includes(id) || (await t$.get("SELECT 1 FROM stylists WHERE id=$1", id))) id = `${base}-${++n}`;
    const sort = Number((await t$.get<{ m: string | null }>("SELECT COALESCE(MAX(sort),0)+1 AS m FROM stylists"))?.m ?? 1);
    await t$.run("INSERT INTO stylists (id,name,note,active,sort,created_at) VALUES ($1,$2,$3,1,$4,$5)", id, body.name, body.note, sort, nowIso());
    return id;
  });
  res.status(201).json({ id: created, name: body.name, note: body.note, active: true, upcomingBookings: 0 });
}));

settingsRouter.patch("/admin/stylists/:id", asyncHandler(async (req, res) => {
  const body = z.object({ name: nameSchema.optional(), note: noteSchema.optional(), active: z.boolean().optional() }).parse(req.body);
  if (!(await stylistsManaged())) throw new HttpError(409, "Add your first stylist to start managing the team; the demo entries are replaced when you do.");
  const cur = await get<any>("SELECT * FROM stylists WHERE id=$1", req.params.id);
  if (!cur) throw notFound("Stylist");
  await run("UPDATE stylists SET name=$1, note=$2, active=$3 WHERE id=$4",
    body.name ?? cur.name, body.note ?? cur.note, body.active === undefined ? cur.active : body.active ? 1 : 0, cur.id);
  res.json({ ok: true, upcomingBookings: body.active === false ? await upcoming(cur.id) : undefined });
}));

settingsRouter.delete("/admin/stylists/:id", asyncHandler(async (req, res) => {
  if (!(await stylistsManaged())) throw new HttpError(409, "Add your first stylist to start managing the team.");
  const cur = await get<any>("SELECT id FROM stylists WHERE id=$1", req.params.id);
  if (!cur) throw notFound("Stylist");
  const used = await get("SELECT 1 FROM bookings WHERE stylist_id=$1 LIMIT 1", cur.id);
  if (used) throw new HttpError(409, "This stylist has booking history, so they can't be deleted. Turn them off instead.");
  await run("DELETE FROM stylists WHERE id=$1", cur.id);
  res.json({ ok: true });
}));

// ---- closed days ---------------------------------------------------------------------------------

settingsRouter.get("/admin/closed-days", asyncHandler(async (_req, res) => {
  const rows = await all<{ date: string; reason: string }>("SELECT date, reason FROM closed_days WHERE date >= $1 ORDER BY date", todayEAT());
  res.json(await Promise.all(rows.map(async (r) => ({
    ...r,
    affectedBookings: Number((await get<{ n: string }>("SELECT COUNT(*) AS n FROM bookings WHERE date=$1 AND status IN ('pending_deposit','confirmed')", r.date))?.n ?? 0),
  }))));
}));

settingsRouter.post("/admin/closed-days", asyncHandler(async (req, res) => {
  const body = z.object({ date: z.string(), reason: z.string().trim().max(120).default("") }).parse(req.body);
  if (!isValidISODate(body.date)) throw new HttpError(400, "Date must be YYYY-MM-DD", { date: "Invalid date" });
  if (body.date < todayEAT()) throw new HttpError(400, "Pick today or a future date", { date: "Date is in the past" });
  await run("INSERT INTO closed_days (date,reason,created_at) VALUES ($1,$2,$3) ON CONFLICT (date) DO UPDATE SET reason=EXCLUDED.reason", body.date, body.reason, nowIso());
  const n = Number((await get<{ n: string }>("SELECT COUNT(*) AS n FROM bookings WHERE date=$1 AND status IN ('pending_deposit','confirmed')", body.date))?.n ?? 0);
  res.status(201).json({ date: body.date, reason: body.reason, affectedBookings: n });
}));

settingsRouter.delete("/admin/closed-days/:date", asyncHandler(async (req, res) => {
  const r = await run("DELETE FROM closed_days WHERE date=$1", req.params.date);
  if (r.rowCount === 0) throw notFound("Closed day");
  res.json({ ok: true });
}));

// ---- recurring, part-day and per-stylist closures -----------------------------------------------

async function upcomingActiveBookings() {
  const rows = await all<{ date: string; time: string; stylist_id: string; duration_minutes: number | string | null }>(
    "SELECT date, time, stylist_id, duration_minutes FROM bookings WHERE date >= $1 AND status IN ('pending_deposit','confirmed')", todayEAT());
  return rows.map((b) => ({ date: b.date, time: b.time, stylistId: b.stylist_id, durationMinutes: Number(b.duration_minutes ?? 60) }));
}

settingsRouter.get("/admin/closures", asyncHandler(async (_req, res) => {
  const [rules, bookings, stylists] = await Promise.all([loadStoredRules(), upcomingActiveBookings(), activeStylists()]);
  const today = todayEAT();
  res.json(rules
    // hide one-off rules that are already over
    .filter((r) => r.recurrence !== "once" || (r.endDate ?? r.startDate ?? "") >= today)
    .map((r) => ({
      ...r,
      stylistName: r.stylistId ? (stylists.find((s) => s.id === r.stylistId)?.name ?? r.stylistId) : null,
      summary: describeRule(r),
      affectedBookings: countAffected(r, bookings),
    })));
}));

settingsRouter.post("/admin/closures", asyncHandler(async (req, res) => {
  const parsed = parseRuleInput(req.body, todayEAT());
  if (!parsed.ok) throw new HttpError(400, "Please check the highlighted fields", parsed.fields);
  const v = parsed.value;
  if (v.stylistId && !(await activeStylists()).some((s) => s.id === v.stylistId)) throw new HttpError(400, "Unknown stylist", { stylistId: "Unknown stylist" });
  const r = await get<any>(
    `INSERT INTO closure_rules (stylist_id,recurrence,start_date,end_date,weekday,month_day,start_time,end_time,reason,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    v.stylistId, v.recurrence, v.startDate, v.endDate, v.weekday, v.monthDay, v.startTime, v.endTime, v.reason, nowIso());
  const rule = rowToRule(r);
  res.status(201).json({ ...rule, summary: describeRule(rule), affectedBookings: countAffected(rule, await upcomingActiveBookings()) });
}));

settingsRouter.delete("/admin/closures/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw notFound("Closure");
  const r = await run("DELETE FROM closure_rules WHERE id=$1", id);
  if (r.rowCount === 0) throw notFound("Closure");
  res.json({ ok: true });
}));
