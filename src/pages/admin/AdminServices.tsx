import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminCreateService, adminDeleteService, adminReplaceService, adminServices } from "../../api/endpoints";
import type { AdminService, AdminServiceInput } from "../../api/endpoints";
import { AdminPage, DataTable } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { ConfirmAction } from "../../components/common/ConfirmAction";
import { FormField } from "../../components/common/FormField";
import { QueryState } from "../../components/common/QueryState";
import { useCatalog } from "../../context/CatalogContext";
import { useAsync } from "../../hooks/useAsync";
import { formatKSh } from "../../utils/format";
import { parseWhole } from "../../utils/numbers";

interface Draft { name: string; category: string; shortDescription: string; description: string; benefits: string; duration: string; hours: string; price: string; bookingType: "instant" | "consultation"; featured: boolean }

const blank: Draft = { name: "", category: "", shortDescription: "", description: "", benefits: "", duration: "", hours: "1", price: "", bookingType: "consultation", featured: false };
const fromService = (s: AdminService): Draft => ({
  name: s.name, category: s.category, shortDescription: s.shortDescription, description: s.description, benefits: s.benefits.join("\n"),
  duration: s.duration, hours: String(s.durationMinutes / 60), price: s.priceFrom === null ? "" : String(s.priceFrom), bookingType: s.bookingType, featured: s.featured,
});

/** Returns the API payload, or field errors. Exported shape is kept small so it is easy to test. */
export function validateDraft(d: Draft): { input?: AdminServiceInput; errors: Partial<Record<keyof Draft, string>> } {
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (d.name.trim().length < 2) errors.name = "Enter a name";
  if (!d.category.trim()) errors.category = "Enter a category";
  if (!d.shortDescription.trim()) errors.shortDescription = "Enter a short description";
  if (!d.description.trim()) errors.description = "Enter a description";
  if (!d.duration.trim()) errors.duration = "Describe the duration, e.g. 3–4 hours";
  const hours = Number(d.hours);
  if (!(hours >= 0.25 && hours <= 12)) errors.hours = "Between 0.25 and 12 hours";
  const blankPrice = d.price.trim() === "";
  const price = blankPrice ? null : parseWhole(d.price);
  if (!blankPrice && price === null) errors.price = "Whole KSh only";
  if (d.bookingType === "instant" && price === null) errors.price = "Instant booking needs a price";
  if (Object.keys(errors).length) return { errors };
  return {
    errors,
    input: {
      name: d.name.trim(), category: d.category.trim(), shortDescription: d.shortDescription.trim(), description: d.description.trim(),
      benefits: d.benefits.split("\n").map((b) => b.trim()).filter(Boolean), duration: d.duration.trim(), durationMinutes: Math.round(hours * 60),
      priceFrom: price, bookingType: d.bookingType, featured: d.featured,
    },
  };
}

function ServiceForm({ initial, onSave, onCancel, saving }: { initial: Draft; onSave: (i: AdminServiceInput) => void; onCancel: () => void; saving: boolean }) {
  const [d, setD] = useState(initial);
  const [show, setShow] = useState(false);
  const { errors, input } = validateDraft(d);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const err = (k: keyof Draft) => (show ? errors[k] : undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); setShow(true); if (input) onSave(input); }} className="mb-8 grid gap-4 rounded-2xl border border-charcoal/10 bg-white p-6 md:grid-cols-2">
      <FormField label="Name" htmlFor="sv-name" error={err("name")}><input id="sv-name" className="input-base" value={d.name} maxLength={100} onChange={(e) => set("name", e.target.value)} /></FormField>
      <FormField label="Category" htmlFor="sv-cat" error={err("category")}><input id="sv-cat" className="input-base" value={d.category} maxLength={60} onChange={(e) => set("category", e.target.value)} placeholder="Installation, Maintenance…" /></FormField>
      <div className="md:col-span-2"><FormField label="Short description" htmlFor="sv-short" error={err("shortDescription")}><input id="sv-short" className="input-base" value={d.shortDescription} maxLength={300} onChange={(e) => set("shortDescription", e.target.value)} /></FormField></div>
      <div className="md:col-span-2"><FormField label="Full description" htmlFor="sv-desc" error={err("description")}><textarea id="sv-desc" rows={4} className="input-base" value={d.description} maxLength={4000} onChange={(e) => set("description", e.target.value)} /></FormField></div>
      <div className="md:col-span-2"><FormField label="Benefits" htmlFor="sv-ben" optional hint="One per line"><textarea id="sv-ben" rows={3} className="input-base" value={d.benefits} onChange={(e) => set("benefits", e.target.value)} /></FormField></div>
      <FormField label="Duration (shown to customers)" htmlFor="sv-dur" error={err("duration")}><input id="sv-dur" className="input-base" value={d.duration} maxLength={80} onChange={(e) => set("duration", e.target.value)} placeholder="About 3 hours" /></FormField>
      <FormField label="Slot length (hours)" htmlFor="sv-hrs" error={err("hours")} hint="Used to block the stylist's calendar"><input id="sv-hrs" inputMode="decimal" className="input-base" value={d.hours} onChange={(e) => set("hours", e.target.value)} /></FormField>
      <FormField label="Booking mode" htmlFor="sv-mode">
        <select id="sv-mode" className="input-base" value={d.bookingType} onChange={(e) => set("bookingType", e.target.value as Draft["bookingType"])}>
          <option value="consultation">Consultation first</option>
          <option value="instant">Instant booking</option>
        </select>
      </FormField>
      <FormField label="Starting price (KSh)" htmlFor="sv-price" error={err("price")} hint="Leave blank for “Request a Quote”"><input id="sv-price" inputMode="numeric" className="input-base" value={d.price} onChange={(e) => set("price", e.target.value)} /></FormField>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} /> Feature on the home page</label>
      <div className="flex justify-end gap-3 md:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save service"}</Button>
      </div>
    </form>
  );
}

export default function AdminServices() {
  const { reload: reloadCatalog } = useCatalog();
  const { data, loading, error, reload } = useAsync((s) => adminServices(s), []);
  const [editing, setEditing] = useState<AdminService | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const services = data ?? [];

  const refresh = async () => { reload(); await reloadCatalog(); };
  const save = async (input: AdminServiceInput) => {
    setSaving(true);
    try {
      if (editing === "new") await adminCreateService(input);
      else if (editing) await adminReplaceService(editing.slug, input);
      toast.success("Service saved.");
      setEditing(null);
      await refresh();
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };
  const remove = async (s: AdminService) => {
    setBusy(s.slug);
    try { await adminDeleteService(s.slug); toast.success(`${s.name} deleted.`); await refresh(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };

  return (
    <AdminPage
      title="Services"
      description="Add, edit or remove services, set prices, durations and whether customers book instantly or start with a consultation. Photos are managed under Images."
      actions={editing === null ? <Button onClick={() => setEditing("new")}>Add service</Button> : undefined}
    >
      {editing !== null && <ServiceForm key={editing === "new" ? "new" : editing.slug} initial={editing === "new" ? blank : fromService(editing)} saving={saving} onSave={(i) => void save(i)} onCancel={() => setEditing(null)} />}
      <QueryState loading={loading} error={error} onRetry={reload}>
        <DataTable head={["Service", "Booking mode", "Duration", "From", ""]} empty={services.length ? undefined : "No services yet."}>
          {services.map((s) => (
            <tr key={s.slug}>
              <td className="px-4 py-3"><div className="font-medium">{s.name}</div><div className="text-xs text-charcoal/55">{s.category} · {s.slug}</div></td>
              <td className="px-4 py-3">{s.bookingType === "instant" ? "Instant booking" : "Consultation first"}</td>
              <td className="px-4 py-3">{s.duration}<div className="text-xs text-charcoal/55">{s.durationMinutes / 60}h slot</div></td>
              <td className="px-4 py-3">{s.priceFrom === null ? "Quote" : formatKSh(s.priceFrom)}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(s); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
                  <ConfirmAction label="Delete" confirmLabel="Delete service" busy={busy === s.slug} onConfirm={() => remove(s)} message="Delete this service? Services with upcoming bookings can't be deleted." />
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </QueryState>
    </AdminPage>
  );
}
