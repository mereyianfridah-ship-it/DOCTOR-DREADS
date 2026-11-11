import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminUpdateProduct } from "../../api/endpoints";
import { AdminPage, DataTable } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { QueryState } from "../../components/common/QueryState";
import { useCatalog } from "../../context/CatalogContext";
import type { Product } from "../../types";
import { formatKSh } from "../../utils/format";
import { parseWhole } from "../../utils/numbers";

function ProductRow({ p, onSaved }: { p: Product; onSaved: () => Promise<void> }) {
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(String(p.stock));
  const [saving, setSaving] = useState(false);
  const priceN = parseWhole(price);
  const stockN = parseWhole(stock);
  const valid = priceN !== null && stockN !== null;
  const dirty = price !== String(p.price) || stock !== String(p.stock);

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await adminUpdateProduct(p.slug, { price: priceN, stock: stockN });
      await onSaved();
      toast.success(`${p.name} updated.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr>
      <td className="px-4 py-3"><div className="font-medium">{p.name}</div><div className="text-xs text-charcoal/55">{p.category} · {p.size} · {p.slug}</div></td>
      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`price-${p.slug}`}>Price (KSh) for {p.name}</label>
        <input id={`price-${p.slug}`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={`input-base !w-28 !py-2 ${priceN === null ? "input-error" : ""}`} />
        <div className="mt-1 text-xs text-charcoal/55">now {formatKSh(p.price)}</div>
      </td>
      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`stock-${p.slug}`}>Stock for {p.name}</label>
        <input id={`stock-${p.slug}`} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={`input-base !w-24 !py-2 ${stockN === null ? "input-error" : ""}`} />
        {p.stock <= 5 && <div className="mt-1 text-xs font-semibold text-red-700">{p.stock === 0 ? "Out of stock" : "Low stock"}</div>}
      </td>
      <td className="px-4 py-3"><Button size="sm" disabled={!dirty || !valid || saving} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</Button></td>
    </tr>
  );
}

export default function AdminProducts() {
  const { products, status, error, reload } = useCatalog();
  return (
    <AdminPage title="Products" description="Edit price (whole KSh) and stock. Creating, archiving, categories, SKUs, photo upload and inventory history are not available yet.">
      <QueryState loading={status === "loading"} error={status === "error" ? error : null} onRetry={() => void reload()}>
        <DataTable head={["Product", "Price (KSh)", "Stock", ""]} empty={products.length ? undefined : "No products."}>
          {products.map((p) => <ProductRow key={`${p.slug}-${p.price}-${p.stock}`} p={p} onSaved={reload} />)}
        </DataTable>
      </QueryState>
    </AdminPage>
  );
}
