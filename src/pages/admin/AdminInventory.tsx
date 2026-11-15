import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import {
  adminAdjustStock, adminCategories, adminCreateCategory, adminDeleteCategory, adminProducts, adminStockMovements, adminUpdateCategory,
} from "../../api/endpoints";
import type { AdminCategory } from "../../api/endpoints";
import { AdminPage, DataTable } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { ConfirmAction } from "../../components/common/ConfirmAction";
import { QueryState } from "../../components/common/QueryState";
import { useAsync } from "../../hooks/useAsync";

type Tab = "stock" | "history" | "categories";
const TABS: { id: Tab; label: string }[] = [
  { id: "stock", label: "Adjust stock" },
  { id: "history", label: "Movement history" },
  { id: "categories", label: "Categories" },
];

function StockTab() {
  const { data, loading, error, reload } = useAsync((s) => adminProducts({ limit: 200 }, s), []);
  const [slug, setSlug] = useState("");
  const [change, setChange] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const products = data ?? [];
  const current = products.find((p) => p.slug === slug);
  const delta = Number(change);
  const valid = Boolean(current) && Number.isInteger(delta) && delta !== 0 && reason.trim().length >= 3;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const r = await adminAdjustStock(slug, { change: delta, reason: reason.trim() });
      toast.success(`Stock is now ${r.stock} (was ${r.previous}).`);
      setChange("");
      setReason("");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <QueryState loading={loading} error={error} onRetry={reload}>
      <form onSubmit={submit} className="mb-6 grid gap-3 rounded-2xl border border-charcoal/10 bg-white p-5 md:grid-cols-[2fr_1fr_2fr_auto] md:items-end">
        <label className="text-sm font-medium">Product
          <select value={slug} onChange={(e) => setSlug(e.target.value)} className="input-base mt-1">
            <option value="">Choose a product…</option>
            {products.map((p) => <option key={p.slug} value={p.slug}>{p.name} ({p.stock} in stock)</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Change
          <input inputMode="numeric" placeholder="+20 or -3" value={change} onChange={(e) => setChange(e.target.value)} className="input-base mt-1" />
        </label>
        <label className="text-sm font-medium">Reason
          <input placeholder="Restock, damaged, stocktake…" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} className="input-base mt-1" />
        </label>
        <Button type="submit" disabled={!valid || busy}>{busy ? "Saving…" : "Record"}</Button>
        {current && Number.isInteger(delta) && delta !== 0 && (
          <p className={`text-sm md:col-span-4 ${current.stock + delta < 0 ? "font-semibold text-red-700" : "text-charcoal/65"}`}>
            {current.stock + delta < 0 ? "That would take stock below zero." : `${current.stock} → ${current.stock + delta}`}
          </p>
        )}
      </form>
      <DataTable head={["Product", "Category", "In stock", "Alert at", "Status"]} empty={products.length ? undefined : "No products."}>
        {products.map((p) => {
          const low = p.stock > 0 && p.stock <= p.low_stock_threshold;
          return (
            <tr key={p.slug}>
              <td className="px-4 py-3">{p.name}</td>
              <td className="px-4 py-3">{p.category}</td>
              <td className="px-4 py-3">{p.stock}</td>
              <td className="px-4 py-3">{p.low_stock_threshold}</td>
              <td className={`px-4 py-3 ${p.stock === 0 ? "font-semibold text-red-700" : low ? "font-semibold text-amber-700" : "text-charcoal/60"}`}>{p.stock === 0 ? "Out of stock" : low ? "Low" : "OK"}</td>
            </tr>
          );
        })}
      </DataTable>
    </QueryState>
  );
}

function HistoryTab() {
  const { data, loading, error, reload } = useAsync((s) => adminStockMovements({ limit: 200 }, s), []);
  const rows = data ?? [];
  return (
    <QueryState loading={loading} error={error} onRetry={reload}>
      <DataTable head={["When", "Product", "Change", "Stock", "Reason"]} empty={rows.length ? undefined : "No stock movements yet."}>
        {rows.map((m) => (
          <tr key={m.id}>
            <td className="px-4 py-3 whitespace-nowrap">{new Date(m.createdAt).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Nairobi" })}</td>
            <td className="px-4 py-3">{m.productName}</td>
            <td className={`px-4 py-3 font-medium ${m.delta < 0 ? "text-red-700" : "text-green-700"}`}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
            <td className="px-4 py-3">{m.previousStock} → {m.newStock}</td>
            <td className="px-4 py-3">{m.reason}{m.orderId ? ` (order #${m.orderId})` : ""}</td>
          </tr>
        ))}
      </DataTable>
    </QueryState>
  );
}

function CategoryRow({ c, onChanged }: { c: AdminCategory; onChanged: () => void }) {
  const [name, setName] = useState(c.name);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); onChanged(); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <tr>
      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`cat-${c.id}`}>Category name</label>
        <input id={`cat-${c.id}`} value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="input-base !py-2" />
      </td>
      <td className="px-4 py-3">{c.products}</td>
      <td className="px-4 py-3">{c.active ? "Shown in shop" : "Hidden"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={busy || !name.trim() || name.trim() === c.name} onClick={() => void run(() => adminUpdateCategory(c.id, { name: name.trim() }), "Category renamed.")}>Save name</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => adminUpdateCategory(c.id, { active: !c.active }), c.active ? "Category hidden." : "Category shown.")}>{c.active ? "Deactivate" : "Activate"}</Button>
          <ConfirmAction label="Delete" confirmLabel="Delete category" busy={busy} onConfirm={() => run(() => adminDeleteCategory(c.id), "Category deleted.")} message="Delete this category? This only works when no products use it." />
        </div>
      </td>
    </tr>
  );
}

function CategoriesTab() {
  const { data, loading, error, reload } = useAsync((s) => adminCategories(s), []);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { await adminCreateCategory({ name: name.trim() }); setName(""); toast.success("Category added."); reload(); }
    catch (err) { toast.error(errorMessage(err)); }
    finally { setBusy(false); }
  };
  const rows = data ?? [];
  return (
    <QueryState loading={loading} error={error} onRetry={reload}>
      <form onSubmit={add} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-charcoal/10 bg-white p-5">
        <label className="text-sm font-medium">New category
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} className="input-base mt-1 !w-64" placeholder="e.g. Shampoos" />
        </label>
        <Button type="submit" disabled={busy || !name.trim()}>Add category</Button>
      </form>
      <DataTable head={["Name", "Products", "Visibility", "Actions"]} empty={rows.length ? undefined : "No categories."}>
        {rows.map((c) => <CategoryRow key={`${c.id}-${c.name}-${c.active}`} c={c} onChanged={reload} />)}
      </DataTable>
    </QueryState>
  );
}

export default function AdminInventory() {
  const [tab, setTab] = useState<Tab>("stock");
  return (
    <AdminPage title="Inventory" description="Record stock changes with a reason, review every movement, and manage product categories.">
      <div role="tablist" aria-label="Inventory sections" className="mb-6 flex gap-2">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t.id ? "bg-charcoal text-offwhite" : "border border-charcoal/20 hover:bg-charcoal/5"}`}>{t.label}</button>
        ))}
      </div>
      {tab === "stock" && <StockTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "categories" && <CategoriesTab />}
    </AdminPage>
  );
}
