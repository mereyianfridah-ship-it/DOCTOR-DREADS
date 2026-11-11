import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminUpdateService } from "../../api/endpoints";
import { AdminPage, DataTable } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { QueryState } from "../../components/common/QueryState";
import { useCatalog } from "../../context/CatalogContext";
import type { Service } from "../../types";
import { parseWhole } from "../../utils/numbers";

function ServiceRow({ s, onSaved }: { s: Service; onSaved: () => Promise<void> }) {
  const initial = s.priceFrom === null ? "" : String(s.priceFrom);
  const [price, setPrice] = useState(initial);
  const [saving, setSaving] = useState(false);
  const blank = price.trim() === "";
  const n = blank ? null : parseWhole(price);
  const valid = blank || n !== null;
  const instantNeedsPrice = s.bookingType === "instant" && blank;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await adminUpdateService(s.slug, { priceFrom: n });
      await onSaved();
      toast.success(`${s.name} updated.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="px-4 py-3"><div className="font-medium">{s.name}</div><div className="text-xs text-charcoal/55">{s.category} · {s.slug}</div></td>
      <td className="px-4 py-3">{s.bookingType === "instant" ? "Instant booking" : "Consultation first"}</td>
      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`sp-${s.slug}`}>Starting price (KSh) for {s.name}</label>
        <input id={`sp-${s.slug}`} inputMode="numeric" placeholder="Quote" value={price} onChange={(e) => setPrice(e.target.value)} className={`input-base !w-28 !py-2 ${!valid ? "input-error" : ""}`} />
        <div className="mt-1 text-xs text-charcoal/55">Leave blank for “Request a Quote”</div>
        {instantNeedsPrice && <div className="mt-1 text-xs font-semibold text-red-700">Instant booking needs a price or it can&apos;t be booked.</div>}
      </td>
      <td className="px-4 py-3"><Button size="sm" disabled={price === initial || !valid || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button></td>
    </tr>
  );
}

export default function AdminServices() {
  const { services, status, error, reload } = useCatalog();
  return (
    <AdminPage title="Services" description="Edit starting prices (whole KSh). Durations, descriptions, booking modes and deposit rules are not editable here yet.">
      <QueryState loading={status === "loading"} error={status === "error" ? error : null} onRetry={() => void reload()}>
        <DataTable head={["Service", "Booking mode", "Starting price (KSh)", ""]} empty={services.length ? undefined : "No services."}>
          {services.map((s) => <ServiceRow key={`${s.slug}-${s.priceFrom}`} s={s} onSaved={reload} />)}
        </DataTable>
      </QueryState>
    </AdminPage>
  );
}
