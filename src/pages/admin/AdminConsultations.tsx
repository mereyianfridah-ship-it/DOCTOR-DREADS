import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { apiBlob, errorMessage } from "../../api/client";
import { adminAddConsultationNote, adminConsultationNotes, adminDeleteConsultationNote, adminConsultations, adminGenerateQuotation, adminSetConsultationStatus } from "../../api/endpoints";
import { AdminPage, Pager, StatusSelect } from "../../components/admin/AdminUi";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import type { ConsultationRecord, ConsultationStatus } from "../../types";
import { formatBytes, formatDateTime, formatKSh } from "../../utils/format";
import { parseWhole } from "../../utils/numbers";
import { consultationStatusInfo } from "../../utils/status";

const PAGE = 25;

/** Private photos are fetched with the admin's bearer token and shown from a temporary blob URL. */
function Photo({ photo, onOpen }: { photo: ConsultationRecord["photos"][number]; onOpen: (url: string, name: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    let created: string | null = null;
    apiBlob(photo.url, ctl.signal)
      .then((b) => {
        if (ctl.signal.aborted) return;
        created = URL.createObjectURL(b);
        setUrl(created);
      })
      .catch(() => {
        if (!ctl.signal.aborted) setFailed(true);
      });
    return () => {
      ctl.abort();
      if (created) URL.revokeObjectURL(created);
    };
  }, [photo.url]);
  if (failed) return <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-charcoal/5 text-center text-[10px] text-charcoal/60">Could not load</div>;
  if (!url) return <div className="h-24 w-24 animate-pulse rounded-lg bg-charcoal/10" />;
  return (
    <button type="button" onClick={() => onOpen(url, photo.name)} className="group text-left" aria-label={`Open photo ${photo.name}`}>
      <img src={url} alt={photo.name} className="h-24 w-24 rounded-lg object-cover transition group-hover:opacity-80" />
      <span className="mt-1 block w-24 truncate text-[10px] text-charcoal/55">{formatBytes(photo.size)}</span>
    </button>
  );
}

/** Price + note the customer sees on their status page. Saving also moves the request to "Quoted". */
function QuotationBuilder({ c, disabled, onSaved }: { c: ConsultationRecord; disabled: boolean; onSaved: () => void }) {
  const [amount, setAmount] = useState(c.quotationAmount != null ? String(c.quotationAmount) : "");
  const [note, setNote] = useState(c.quotationNote);
  const [saving, setSaving] = useState(false);
  const closed = c.status === "closed";

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseWhole(amount);
    if (n == null || n <= 0) return void toast.error("Enter the quoted amount as a whole number of KSh.");
    setSaving(true);
    try {
      await adminGenerateQuotation(c.reference, n, note.trim());
      toast.success(c.quotationAmount != null ? "Quotation updated." : "Quotation sent to the customer's status page.");
      onSaved();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="mt-5 rounded-xl border border-charcoal/10 bg-cream/40 p-4" aria-label={`Quotation for ${c.reference}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Quotation</h3>
        {c.quotationAmount != null && <p className="text-xs text-charcoal/60">Current: {formatKSh(c.quotationAmount)}{c.quotedAt ? ` · ${formatDateTime(c.quotedAt)}` : ""}</p>}
      </div>
      {c.quotationAmount != null && (
        <p className="mt-2 text-xs" role="status">
          {c.quotationResponse === "accepted" && <span className="font-semibold text-olive">Customer accepted{c.quotationRespondedAt ? ` · ${formatDateTime(c.quotationRespondedAt)}` : ""}. Follow up to arrange the next step.</span>}
          {c.quotationResponse === "declined" && <span className="font-semibold text-red-800">Customer declined{c.quotationRespondedAt ? ` · ${formatDateTime(c.quotationRespondedAt)}` : ""}.</span>}
          {!c.quotationResponse && <span className="text-charcoal/60">Awaiting the customer's response. Updating the quotation resets any response.</span>}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div>
          <label htmlFor={`qa-${c.reference}`} className="mb-1 block text-xs text-charcoal/60">Amount (KSh)</label>
          <input id={`qa-${c.reference}`} inputMode="numeric" className="input-base !py-2 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={closed} />
        </div>
        <div>
          <label htmlFor={`qn-${c.reference}`} className="mb-1 block text-xs text-charcoal/60">Note for the customer (optional)</label>
          <textarea id={`qn-${c.reference}`} rows={2} maxLength={1000} className="input-base !py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} disabled={closed} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving || disabled || closed} className="rounded-full bg-charcoal px-5 py-2 text-sm font-semibold text-offwhite transition hover:bg-brown disabled:opacity-50">
          {saving ? "Saving…" : c.quotationAmount != null ? "Update quotation" : "Send quotation"}
        </button>
        {closed && <p className="text-xs text-charcoal/60">Reopen this request (change its status) to quote.</p>}
      </div>
    </form>
  );
}

/** Internal staff notes. Loaded on demand; never shown to customers. */
function NotesPanel({ reference }: { reference: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const { data, loading, error, reload } = useAsync(
    (sig) => (open ? adminConsultationNotes(reference, sig) : Promise.resolve(undefined)),
    [reference, open]
  );
  const notes = data ?? [];

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return void toast.error("Write a note first.");
    setSaving(true);
    try {
      await adminAddConsultationNote(reference, text.trim());
      setText("");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };
  const remove = async (id: number) => {
    setRemoving(id);
    try {
      await adminDeleteConsultationNote(reference, id);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-sm font-semibold text-brown hover:underline">
        {open ? "Hide internal notes" : "Internal notes"}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-charcoal/10 p-4">
          <p className="text-xs text-charcoal/55">Only staff can see these. They are never shown to the customer.</p>
          <form onSubmit={add} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor={`note-${reference}`} className="sr-only">New note</label>
            <textarea id={`note-${reference}`} rows={2} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} className="input-base !py-2 text-sm" placeholder="e.g. Called, prefers weekend appointments" />
            <button type="submit" disabled={saving} className="self-start rounded-full bg-charcoal px-5 py-2 text-sm font-semibold text-offwhite transition hover:bg-brown disabled:opacity-50">{saving ? "Adding…" : "Add note"}</button>
          </form>
          {loading && <p className="mt-3 text-sm text-charcoal/60">Loading…</p>}
          {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
          {!loading && !error && notes.length === 0 && <p className="mt-3 text-sm text-charcoal/60">No notes yet.</p>}
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-lg bg-charcoal/5 px-3 py-2 text-sm">
                <p className="whitespace-pre-line">{n.body}</p>
                <p className="mt-1 flex items-center justify-between gap-3 text-xs text-charcoal/55">
                  <span>{n.authorName} · {formatDateTime(n.createdAt)}</span>
                  <button type="button" disabled={removing === n.id} onClick={() => void remove(n.id)} className="font-medium text-red-800 hover:underline disabled:opacity-50" aria-label={`Delete note from ${n.authorName}`}>Delete</button>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AdminConsultations() {
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null);
  const { data, loading, error, reload } = useAsync((s) => adminConsultations({ status, limit: PAGE, offset }, s), [status, offset]);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setViewer(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [viewer]);

  const setConsultationStatus = async (reference: string, next: ConsultationStatus) => {
    setBusy(reference);
    try {
      await adminSetConsultationStatus(reference, next);
      toast.success("Status updated.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const rows = data ?? [];
  return (
    <AdminPage
      title="Consultation requests"
      description="Customer photos are private: they load only for signed-in admins. Sending a quotation shows it on the customer's status page and marks the request as quoted. Internal notes are staff-only. Stylist assignment is not available yet."
      actions={<StatusSelect label="Consultation status" value={status} onChange={(v) => { setStatus(v); setOffset(0); }} options={Object.entries(consultationStatusInfo).map(([value, i]) => ({ value, label: i.label }))} />}
    >
      <QueryState loading={loading} error={error} onRetry={reload}>
        {rows.length === 0 && <p className="rounded-2xl border border-charcoal/10 bg-white px-4 py-8 text-center text-sm text-charcoal/60">No consultation requests found.</p>}
        <ul className="space-y-4">
          {rows.map((c) => (
            <li key={c.reference} className="rounded-2xl border border-charcoal/10 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-charcoal/55">{c.reference} · {formatDateTime(c.createdAt)}</p>
                  <h2 className="text-2xl">{c.fullName}</h2>
                  <p className="text-sm text-charcoal/70">{c.phone}{c.email ? ` · ${c.email}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge {...consultationStatusInfo[c.status]} />
                  <label className="sr-only" htmlFor={`cs-${c.reference}`}>Change status</label>
                  <select id={`cs-${c.reference}`} value={c.status} disabled={busy === c.reference} onChange={(e) => void setConsultationStatus(c.reference, e.target.value as ConsultationStatus)} className="input-base !w-auto !py-2 text-sm">
                    {Object.entries(consultationStatusInfo).map(([value, i]) => <option key={value} value={value}>{i.label}</option>)}
                  </select>
                </div>
              </div>
              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                {[["Hair condition", c.condition], ["Hair length", c.length], ["Loc size", c.locSize], ["Installation type", c.installType]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 border-b border-charcoal/5 py-1"><dt className="text-charcoal/60">{k}</dt><dd className="font-medium">{v}</dd></div>
                ))}
              </dl>
              {c.info && <p className="mt-3 text-sm"><span className="text-charcoal/60">Notes: </span>{c.info}</p>}
              <p className="mt-2 text-xs text-charcoal/55">Marketing consent: {c.marketingConsent ? "yes" : "no"}</p>
              <QuotationBuilder key={`${c.reference}-${c.quotedAt ?? "none"}`} c={c} disabled={busy === c.reference} onSaved={reload} />
              <NotesPanel reference={c.reference} />
              {c.photos.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {c.photos.map((p) => <Photo key={p.id} photo={p} onOpen={(url, name) => setViewer({ url, name })} />)}
                </div>
              )}
            </li>
          ))}
        </ul>
        <Pager offset={offset} pageSize={PAGE} count={rows.length} onChange={setOffset} />
      </QueryState>

      {viewer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-charcoal/95 p-4" role="dialog" aria-modal="true" aria-label={viewer.name}>
          <button type="button" onClick={() => setViewer(null)} aria-label="Close" className="absolute right-4 top-4 rounded-full bg-offwhite/10 p-3 text-offwhite hover:bg-offwhite/20"><X className="h-6 w-6" /></button>
          <img src={viewer.url} alt={viewer.name} className="max-h-[85vh] max-w-full rounded-2xl object-contain" />
        </div>
      )}
    </AdminPage>
  );
}
