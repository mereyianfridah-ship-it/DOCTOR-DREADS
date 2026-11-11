import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { apiBlob, errorMessage } from "../../api/client";
import { adminConsultations, adminSetConsultationStatus } from "../../api/endpoints";
import { AdminPage, Pager, StatusSelect } from "../../components/admin/AdminUi";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import type { ConsultationRecord, ConsultationStatus } from "../../types";
import { formatBytes, formatDateTime } from "../../utils/format";
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
      description="Customer photos are private: they load only for signed-in admins. Quotation building, notes and stylist assignment are not available yet."
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
