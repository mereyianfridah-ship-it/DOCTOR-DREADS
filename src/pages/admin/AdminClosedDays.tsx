import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { ApiError, errorMessage } from "../../api/client";
import { adminAddClosure, adminClosedDays, adminClosures, adminCloseDay, adminDeleteClosure, adminReopenDay } from "../../api/endpoints";
import type { ClosureInput, ClosureRecurrence } from "../../api/endpoints";
import { FormField } from "../../components/common/FormField";
import { useCatalog } from "../../context/CatalogContext";
import { AdminPage } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { QueryState } from "../../components/common/QueryState";
import { useAsync } from "../../hooks/useAsync";
import { formatLongDate } from "../../utils/format";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** Recurring closures, part-day closures and stylist days off. */
function ClosureRules({ today }: { today: string }) {
  const { rules } = useCatalog();
  const stylists = (rules?.stylists ?? []).filter((s) => s.id !== "auto");
  const { data, loading, error, reload } = useAsync((s) => adminClosures(s), []);
  const [who, setWho] = useState(""); // "" = whole salon
  const [recurrence, setRecurrence] = useState<ClosureRecurrence>("once");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [weekday, setWeekday] = useState(1);
  const [month, setMonth] = useState(12);
  const [day, setDay] = useState(25);
  const [partial, setPartial] = useState(false);
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("14:00");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const body: ClosureInput = { recurrence, reason: reason.trim() };
    if (who) body.stylistId = who;
    if (recurrence === "once") { body.startDate = startDate; if (endDate) body.endDate = endDate; }
    if (recurrence === "weekly") { body.weekday = weekday; if (startDate) body.startDate = startDate; if (endDate) body.endDate = endDate; }
    if (recurrence === "yearly") body.monthDay = `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (partial) { body.startTime = startTime; body.endTime = endTime; }
    setBusy(true);
    setErrors({});
    try {
      const r = await adminAddClosure(body);
      toast.success(r.affectedBookings > 0 ? `Saved. ${r.affectedBookings} existing booking(s) clash with it: contact those customers.` : "Saved");
      setReason(""); setStartDate(""); setEndDate(""); reload();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };

  const remove = async (id: number) => {
    if (!window.confirm("Remove this closure? Customers will be able to book those times again.")) return;
    try { await adminDeleteClosure(id); toast.success("Removed"); reload(); } catch (err) { toast.error(errorMessage(err)); }
  };

  const sel = "input-base";
  return (
    <section className="mt-12" aria-labelledby="rules-heading">
      <h2 id="rules-heading" className="text-2xl">Repeating closures, part-day closures &amp; days off</h2>
      <p className="mt-1 max-w-2xl text-sm text-charcoal/65">
        Close every Monday, close for lunch each day, block a stylist&apos;s leave, or close every 25 December. Closed dates are greyed out for customers; part-day closures hide only those times.
      </p>
      <form onSubmit={(e) => void add(e)} noValidate className="mt-5 grid gap-4 rounded-2xl border border-charcoal/10 bg-white p-6 sm:grid-cols-2">
        <FormField label="Who is closed or off?" htmlFor="cr-who">
          <select id="cr-who" className={sel} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value="">Whole salon</option>
            {stylists.map((s) => <option key={s.id} value={s.id}>{s.name} (days off)</option>)}
          </select>
        </FormField>
        <FormField label="How often?" htmlFor="cr-rec">
          <select id="cr-rec" className={sel} value={recurrence} onChange={(e) => { setRecurrence(e.target.value as ClosureRecurrence); setErrors({}); }}>
            <option value="once">One date or a date range</option>
            <option value="weekly">Every week</option>
            <option value="yearly">Every year</option>
          </select>
        </FormField>

        {recurrence === "weekly" && (
          <FormField label="Day of the week" htmlFor="cr-wd" error={errors.weekday}>
            <select id="cr-wd" className={sel} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
              {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
            </select>
          </FormField>
        )}
        {recurrence === "yearly" && (
          <FormField label="Date each year" htmlFor="cr-month" error={errors.monthDay}>
            <div className="flex gap-2">
              <select id="cr-month" aria-label="Month" className={sel} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <input aria-label="Day of month" type="number" min={1} max={31} className={`${sel} !w-24`} value={day} onChange={(e) => setDay(Number(e.target.value))} />
            </div>
          </FormField>
        )}
        {recurrence !== "yearly" && (
          <>
            <FormField label={recurrence === "once" ? "Date" : "From"} htmlFor="cr-start" optional={recurrence === "weekly"} error={errors.startDate}>
              <input id="cr-start" type="date" min={today} className={`${sel} ${errors.startDate ? "input-error" : ""}`} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label={recurrence === "once" ? "Until" : "Until (stops repeating after)"} htmlFor="cr-end" optional error={errors.endDate} hint={recurrence === "once" ? "Leave empty for a single day" : "Leave empty to repeat indefinitely"}>
              <input id="cr-end" type="date" min={startDate || today} className={`${sel} ${errors.endDate ? "input-error" : ""}`} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </FormField>
          </>
        )}

        <fieldset className="sm:col-span-2">
          <legend className="mb-1.5 text-sm font-medium">Hours</legend>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="cr-hours" checked={!partial} onChange={() => setPartial(false)} /> Closed all day</label>
            <label className="flex items-center gap-2 text-sm"><input type="radio" name="cr-hours" checked={partial} onChange={() => setPartial(true)} /> Only between</label>
            <div className="flex items-center gap-2">
              <input aria-label="Closed from" type="time" disabled={!partial} className={`${sel} !w-40 ${errors.startTime ? "input-error" : ""}`} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <span className="text-sm">and</span>
              <input aria-label="Closed until" type="time" disabled={!partial} className={`${sel} !w-40 ${errors.endTime ? "input-error" : ""}`} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {(errors.startTime || errors.endTime) && <p role="alert" className="mt-1 text-sm text-red-700">{errors.startTime || errors.endTime}</p>}
        </fieldset>

        <div className="sm:col-span-2">
          <FormField label="Reason" htmlFor="cr-reason" optional error={errors.reason} hint="Shown to customers, e.g. “Staff lunch” or “Annual leave”">
            <input id="cr-reason" className={sel} maxLength={120} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
        </div>
        <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? "Saving…" : "Add closure"}</Button></div>
      </form>

      <QueryState loading={loading && !data} error={error} onRetry={reload}>
        <ul className="mt-6 space-y-3">
          {(data ?? []).map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white p-5">
              <div>
                <p className="font-semibold">{c.stylistName ? `${c.stylistName}: day off` : "Whole salon"}</p>
                <p className="text-sm text-charcoal/75">{c.summary}{c.recurrence === "weekly" && c.startDate ? ` · from ${formatLongDate(c.startDate)}` : ""}{c.recurrence === "weekly" && c.endDate ? ` · until ${formatLongDate(c.endDate)}` : ""}</p>
                <p className="text-sm text-charcoal/60">{c.reason || "No reason given"}</p>
                {c.affectedBookings > 0 && <p className="mt-1 text-sm font-semibold text-red-700">{c.affectedBookings} upcoming booking{c.affectedBookings === 1 ? "" : "s"} clash with this: contact the customer{c.affectedBookings === 1 ? "" : "s"}.</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => void remove(c.id)}>Remove</Button>
            </li>
          ))}
          {(data ?? []).length === 0 && <li className="rounded-2xl border border-charcoal/10 bg-white px-4 py-8 text-center text-sm text-charcoal/60">No repeating, part-day or stylist closures yet.</li>}
        </ul>
      </QueryState>
    </section>
  );
}

export default function AdminClosedDays() {
  const { data, loading, error, reload } = useAsync((s) => adminClosedDays(s), []);
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10); // East Africa Time

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!date) return toast.error("Pick a date");
    setBusy(true);
    try {
      const r = await adminCloseDay({ date, reason: reason.trim() });
      toast.success(r.affectedBookings > 0 ? `Closed. ${r.affectedBookings} existing booking(s) that day need your attention.` : "Day closed");
      setDate(""); setReason(""); reload();
    } catch (err) { toast.error(errorMessage(err)); } finally { setBusy(false); }
  };

  const reopen = async (d: string) => {
    if (!window.confirm("Reopen this day for bookings?")) return;
    try { await adminReopenDay(d); toast.success("Day reopened"); reload(); } catch (err) { toast.error(errorMessage(err)); }
  };

  return (
    <AdminPage title="Closed days" description="Holidays, leave or events. Customers can't book or reschedule onto these dates. Existing bookings are not cancelled: contact those customers yourself.">
      <form onSubmit={(e) => void add(e)} className="mb-8 grid gap-4 rounded-2xl border border-charcoal/10 bg-white p-6 sm:grid-cols-[200px_1fr_auto] sm:items-end" noValidate>
        <div>
          <label htmlFor="cd-date" className="mb-1 block text-sm font-semibold">Date</label>
          <input id="cd-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className="input-base" />
        </div>
        <div>
          <label htmlFor="cd-reason" className="mb-1 block text-sm font-semibold">Reason <span className="font-normal text-charcoal/55">(optional, shown to customers)</span></label>
          <input id="cd-reason" value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Public holiday" className="input-base" />
        </div>
        <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Close this day"}</Button>
      </form>
      <QueryState loading={loading && !data} error={error} onRetry={reload}>
        <ul className="space-y-3">
          {(data ?? []).map((d) => (
            <li key={d.date} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white p-5">
              <div>
                <p className="font-semibold">{formatLongDate(d.date)}</p>
                <p className="text-sm text-charcoal/65">{d.reason || "No reason given"}</p>
                {d.affectedBookings > 0 && <p className="mt-1 text-sm font-semibold text-red-700">{d.affectedBookings} active booking{d.affectedBookings === 1 ? "" : "s"} on this day: contact the customer{d.affectedBookings === 1 ? "" : "s"}.</p>}
              </div>
              <Button size="sm" variant="outline" onClick={() => void reopen(d.date)}>Reopen</Button>
            </li>
          ))}
          {(data ?? []).length === 0 && <li className="rounded-2xl border border-charcoal/10 bg-white px-4 py-8 text-center text-sm text-charcoal/60">No upcoming closed days.</li>}
        </ul>
      </QueryState>
      <ClosureRules today={today} />
    </AdminPage>
  );
}
