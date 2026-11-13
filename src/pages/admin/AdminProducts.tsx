import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminUpdateProduct } from "../../api/endpoints";
import { useCatalog } from "../../context/CatalogContext";
import { AdminPage, DataTable } from "../../components/admin/AdminUi"; // <--- EmptyState removed
import { Button } from "../../components/common/Button";
import { formatKSh } from "../../utils/format";
import { parseWhole } from "../../utils/numbers";
import type { Product } from "../../types";

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
      <td className="px-4 py-3">
        <div className="font-medium">{p.name}</div>
        <div className="text-xs text-charcoal/55">
          {p.category} · {p.size || ""} · {p.slug}
        </div>
      </td>
      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`price-${p.slug}`}>Price (KSh) for {p.name}</label>
        <input
          id={`price-${p.slug}`}
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={`input-base !w-28 !py-2 ${priceN === null ? "input-error" : ""}`}
        />
        <div className="mt-1 text-xs text-charcoal/55">now {formatKSh(p.price)}</div>
      </td>
      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`stock-${p.slug}`}>Stock for {p.name}</label>
        <input
          id={`stock-${p.slug}`}
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className={`input-base !w-24 !py-2 ${stockN === null ? "input-error" : ""}`}
        />
        {p.stock <= (p.low_stock_threshold ?? 5) && (
          <div className="mt-1 text-xs font-semibold text-red-700">
            {p.stock === 0 ? "Out of stock" : "Low stock"}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className={p.status === "archived" ? "text-xs text-gray-500" : p.status === "draft" ? "text-xs text-amber-600" : "text-xs text-green-600"}>
          {p.status}
        </span>
      </td>
      <td className="px-4 py-3 flex gap-2">
        <Button size="sm" disabled={!dirty || !valid || saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </td>
    </tr>
  );
}

export default function AdminProducts() {
  const { products, status, error, reload } = useCatalog();
  const [mode, setMode] = useState<"list" | "create">("list");
  
  const [newProduct, setNewProduct] = useState({ name: "", slug: "", price: "", stock: "", category: "haircare" });
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Uncomment this when you import adminCreateProduct
      // await adminCreateProduct({ ...newProduct, price: Number(newProduct.price), stock: Number(newProduct.stock) });
      toast.success("Product created (mocked)");
      setMode("list");
      await reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminPage
      title="Products"
      description="Full product management: create, edit, categories, images, status, and inventory history"
    >
      {mode === "list" ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Products</h2>
            <Button size="sm" onClick={() => setMode("create")}>
              Create Product
            </Button>
          </div>

          {status === "loading" ? (
            <div className="py-8 text-center text-charcoal/50">Loading products...</div>
          ) : status === "error" ? (
            <div className="py-8 text-center text-red-600">
              <p>{error}</p>
              <Button size="sm" onClick={() => void reload()} className="mt-4">Retry</Button>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-gray-300 rounded-xl">
              <h3 className="text-lg font-semibold text-gray-900">No products yet</h3>
              <p className="text-sm text-gray-500 mt-1">Create your first product to get started.</p>
            </div>
          ) : (
            <DataTable head={["Product", "Price (KSh)", "Stock", "Status", "Actions"]}>
              {products.map((p) => (
                <ProductRow key={`${p.slug}-${p.price}-${p.stock}`} p={p} onSaved={reload} />
              ))}
            </DataTable>
          )}

          <div className="mt-4 pt-4 border-t border-charcoal/20">
            <p className="text-sm text-charcoal/60">
              {products.filter((p) => p.stock <= (p.low_stock_threshold ?? 5)).length} product(s) below low stock threshold
            </p>
          </div>
        </div>
      ) : (
        <div className="max-w-xl space-y-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4">Create New Product</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input required className="input-base w-full" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">URL Slug</label>
              <input required className="input-base w-full" placeholder="e.g. locs-repair-oil" value={newProduct.slug} onChange={e => setNewProduct({...newProduct, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})} />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Price (KSh)</label>
                <input required type="number" min="0" className="input-base w-full" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Initial Stock</label>
                <input required type="number" min="0" className="input-base w-full" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
              </div>
            </div>
            <div className="pt-4 flex gap-2">
              <Button type="submit" disabled={isSaving}>{isSaving ? "Creating..." : "Save Product"}</Button>
              <Button type="button" variant="outline" onClick={() => setMode("list")}>Cancel</Button>
            </div>
          </form>
        </div>
      )}
    </AdminPage>
  );
}