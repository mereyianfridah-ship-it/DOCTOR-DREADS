import { useMemo, useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { getAvailability, getClosures, rescheduleBooking } from "../../api/endpoints";
import { Button } from "../common/Button";
import { QueryState } from "../common/QueryState";
import { DatePicker } from "./DatePicker";
import { useAsync } from "../../hooks/useAsync";
import { useCatalog } from "../../context/CatalogContext";
import type { BookingRecord } from "../../types";
import { formatLongDate, toISODate } from "../../utils/format";

/**
 * Lets a customer move their own appointment. Eligibility (status, limit, notice period) is decided by the server
 * and arrives on the booking; this component only offers the picker when `canReschedule` is true.
 */
export function RescheduleBooking({ booking, email, onDone }: { booking: BookingRecord; email?: string; onDone: (note?: string) => void }) {
  const { rules } = useCatalog();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [keepStylist, setKeepStylist] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = useMemo(() => new Date(), []);
  const minDate = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), [today]);
  const maxDate = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + (rules?.booking.advanceDays ?? 45)), [today, rules]);

  const availability = useAsync(
    (signal) => (open && date ? getAvailability(date, keepStylist ? booking.stylistId : "auto", signal) : Promise.resolve(null)),
    [open, date, keepStylist, booking.stylistId],
  );

  // Grey out dates this stylist (or, if not keeping them, everyone) can't take.
  const closureData = useAsync(
    (signal) => (open ? getClosures(toISODate(minDate), toISODate(maxDate), keepStylist ? booking.stylistId : "auto", signal) : Promise.resolve(null)),
    [open, keepStylist, booking.stylistId, minDate, maxDate],
  );
  const closures = useMemo(() => Object.fromEntries((closureData.data?.dates ?? []).map((c) => [c.date, c])), [closureData.data]);

  if (booking.status !== "pending_deposit" && booking.status !== "confirmed") return null;

  if (!booking.canReschedule) {
    return booking.rescheduleBlockedReason ? <p className="mt-8 rounded-xl bg-charcoal/5 p-4 text-sm text-charcoal/75">{booking.rescheduleBlockedReason}</p> : null;
  }
  if (!rules) return null;

  const confirm = async () => {
    setSaving(true);
    try {
      const r = await rescheduleBooking(booking.reference, { date, time, stylist: keepStylist ? "same" : "auto", email });
      toast.success("Appointment rescheduled.");
      setOpen(false);
      setDate("");
      setTime("");
      onDone(r.note);
    } catch (e) {
      toast.error(errorMessage(e));
      availability.reload(); // the slot may just have been taken
      setTime("");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="mt-8">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>Reschedule appointment</Button>
        <p className="mt-2 text-xs text-charcoal/55">You can move this once or twice online, with at least a day&apos;s notice.</p>
      </div>
    );
  }

  return (
    <section aria-label="Reschedule appointment" className="mt-8 rounded-2xl border border-charcoal/10 bg-cream/40 p-5">
      <h3 className="text-2xl">Choose a new time</h3>
      <p className="mt-1 text-sm text-charcoal/65">Currently {formatLongDate(booking.date)} at {booking.time}.</p>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={keepStylist} onChange={(e) => { setKeepStylist(e.target.checked); setTime(""); }} />
        Keep the same stylist (untick to accept any available stylist)
      </label>
      <div className="mt-4">
        <DatePicker value={date} onChange={(iso) => { setDate(iso); setTime(""); }} minDate={minDate} maxDate={maxDate} openDays={rules.booking.openDays} closures={closures} />
      </div>
      {date && (
        <div className="mt-4">
          <QueryState loading={availability.loading} error={availability.error} onRetry={availability.reload} loadingLabel="Checking availability">
            {availability.data && !availability.data.open ? (
              <p className="text-sm">The salon is closed on this day. Please choose another date.</p>
            ) : availability.data?.stylistOff ? (
              <p className="text-sm">Your stylist is off on this day{availability.data.stylistOffReason ? ` (${availability.data.stylistOffReason})` : ""}. Choose another date, or untick &ldquo;keep the same stylist&rdquo;.</p>
            ) : (
              <>
              {!!availability.data?.closedWindows?.length && (
                <p className="mb-3 text-sm text-charcoal/70">Not available: {availability.data.closedWindows.map((w) => `${w.from}–${w.to}`).join(", ")}.</p>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Available times">
                {(availability.data?.slots ?? []).map((s) => (
                  <button key={s.time} type="button" role="radio" aria-checked={time === s.time} disabled={!s.available} onClick={() => setTime(s.time)}
                    className={`rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${time === s.time ? "border-brown bg-brown text-offwhite" : "border-charcoal/15 bg-white hover:border-brown"} disabled:cursor-not-allowed disabled:opacity-40`}>
                    {s.time}
                    <span className="block text-xs font-normal opacity-70">{s.available ? "Available" : "Unavailable"}</span>
                  </button>
                ))}
              </div>
              </>
            )}
          </QueryState>
        </div>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button size="sm" disabled={!date || !time || saving} onClick={() => void confirm()}>{saving ? "Saving…" : "Confirm new time"}</Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Keep current time</Button>
      </div>
      {date && time && <p className="mt-3 text-sm text-charcoal/70">New time: <strong>{formatLongDate(date)} at {time}</strong></p>}
    </section>
  );
}
