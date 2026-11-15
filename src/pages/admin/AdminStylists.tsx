import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminAddStylist, adminDeleteStylist, adminStylists, adminUpdateStylist } from "../../api/endpoints";
import { AdminPage } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useCatalog } from "../../context/CatalogContext";
import { useAsync } from "../../hooks/useAsync";
import type { AdminStylist } from "../../types";

export default function AdminStylists() {
  const { reload: reloadCatalog } = useCatalog();
  const { data, loading, error, reload } = useAsync((s) => adminStylists(s), []);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; note: string } | null>(null);

  const managed = data?.managed ?? false;
  const stylists = data?.stylists ?? [];
  const activeCount = stylists.filter((s) => s.active).length;

  /** Runs a change, refreshes this list AND the booking form's stylist list. */
  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      reload();
      void reloadCatalog();
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter the stylist's name");
    if (!managed && !window.confirm("Adding your first stylist replaces the demo stylists on the booking form. Continue?")) return;
    if (await act("new", () => adminAddStylist({ name: name.trim(), note: note.trim() }), "Stylist added")) { setName(""); setNote(""); }
  };

  const toggle = async (s: AdminStylist) => {
    if (s.active && s.upcomingBookings > 0 && !window.confirm(`${s.name} has ${s.upcomingBookings} upcoming booking${s.upcomingBookings === 1 ? "" : "s"}. They stay in place, but nobody new can book ${s.name}. Turn off?`)) return;
    await act(s.id, () => adminUpdateStylist(s.id, { active: !s.active }), s.active ? `${s.name} turned off` : `${s.name} turned on`);
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editing.name.trim().length < 2) return toast.error("Enter the stylist's name");
    if (await act(editing.id, () => adminUpdateStylist(editing.id, { name: editing.name.trim(), note: editing.note.trim() }), "Stylist updated")) setEditing(null);
  };

  return (
    <AdminPage title="Stylists" description="The people customers can book with. Turn someone off for leave or when they leave; their past bookings are kept.">
      <QueryState loading={loading && !data} error={error} onRetry={reload}>
        {!managed && (
          <p className="mb-4 rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm" role="status">
            The website is currently showing <strong>demo stylists</strong>. Add your first real stylist below and the demo ones are replaced.
          </p>
        )}
        {managed && activeCount === 0 && (
          <p className="mb-4 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            No stylist is turned on, so <strong>online booking is paused</strong>. Turn someone on or add a stylist.
          </p>
        )}

        <ul className="space-y-3">
          {stylists.map((s) => (
            <li key={s.id} className="rounded-2xl border border-charcoal/10 bg-white p-5">
              {editing?.id === s.id ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="st-edit-name" className="mb-1 block text-sm font-semibold">Name</label>
                    <input id="st-edit-name" className="input-base" value={editing.name} maxLength={60} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                  </div>
                  <div>
                    <label htmlFor="st-edit-note" className="mb-1 block text-sm font-semibold">Short description</label>
                    <input id="st-edit-note" className="input-base" value={editing.note} maxLength={160} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
                  </div>
                  <div className="flex gap-2 sm:col-span-2">
                    <Button size="sm" disabled={busy === s.id} onClick={() => void saveEdit()}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl">{s.name}</h2>
                      <StatusBadge label={managed ? (s.active ? "Taking bookings" : "Turned off") : "Demo"} tone={managed ? (s.active ? "olive" : "grey") : "gold"} />
                    </div>
                    {s.note && <p className="text-sm text-charcoal/65">{s.note}</p>}
                    <p className="mt-1 text-xs text-charcoal/55">{s.upcomingBookings} upcoming booking{s.upcomingBookings === 1 ? "" : "s"}</p>
                  </div>
                  {managed && (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => setEditing({ id: s.id, name: s.name, note: s.note })}>Edit</Button>
                      <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => void toggle(s)}>{s.active ? "Turn off" : "Turn on"}</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === s.id}
                        onClick={() => { if (window.confirm(`Delete ${s.name}? This only works if they have no booking history; otherwise turn them off.`)) void act(s.id, () => adminDeleteStylist(s.id), "Stylist deleted"); }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
          {stylists.length === 0 && <li className="rounded-2xl border border-charcoal/10 bg-white px-4 py-8 text-center text-sm text-charcoal/60">No stylists yet.</li>}
        </ul>

        <form onSubmit={(e) => void add(e)} className="mt-8 rounded-2xl border border-charcoal/10 bg-white p-6" noValidate>
          <h2 className="text-xl">Add a stylist</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="st-name" className="mb-1 block text-sm font-semibold">Name</label>
              <input id="st-name" className="input-base" value={name} maxLength={60} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jane Wanjiru" />
            </div>
            <div>
              <label htmlFor="st-note" className="mb-1 block text-sm font-semibold">Short description <span className="font-normal text-charcoal/55">(optional)</span></label>
              <input id="st-note" className="input-base" value={note} maxLength={160} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Senior loctician" />
            </div>
          </div>
          <div className="mt-4"><Button type="submit" disabled={busy === "new"}>{busy === "new" ? "Adding…" : "Add stylist"}</Button></div>
        </form>
      </QueryState>
    </AdminPage>
  );
}
