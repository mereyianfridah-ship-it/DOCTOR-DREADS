import { useState, useRef } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { errorMessage } from "../../api/client";
import { adminCreateProduct, adminUpdateProduct, adminProductImages } from "../../api/endpoints";
import { useCatalog } from "../../context/CatalogContext";
import { AdminPage, DataTable } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { formatKSh } from "../../utils/format";
import { parseWhole } from "../../utils/numbers";
import type { Product } from "../../types";

function ProductRow({ p, onSaved }: { p: Product; onSaved: () => Promise<void> }) {
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(String(p.stock));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("product_slug", p.slug);

    try {
      await adminProductImages(formData);
      await onSaved();
      toast.success("Image uploaded to Cloudinary!");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="flex items-center gap-4">
          {p.images && p.images.length > 0 ? (
            <img src={p.images[0]} alt={p.name} className="w-12 h-12 object-cover rounded-lg border shadow-sm" />
          ) : (
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-[10px] text-gray-400 border border-dashed text-center leading-tight">No<br/>image</div>
          )}
          <div>
            <div className="font-medium">{p.name}</div>
            <div className="text-xs text-charcoal/55">
              {p.category} · {p.size || "Standard"} · {p.slug}
            </div>
          </div>
        </div>
      </td>
      
      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`price-${p.slug}`}>Price (KSh) for {p.name}</label>
        <input
          id={`price-${p.slug}`}
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className={`input-base !w-24 !py-2 ${priceN === null ? "input-error" : ""}`}
        />
      </td>
      
      <td className="px-4 py-3">
        <label className="sr-only" htmlFor={`stock-${p.slug}`}>Stock for {p.name}</label>
        <input
          id={`stock-${p.slug}`}
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className={`input-base !w-20 !py-2 ${stockN === null ? "input-error" : ""}`}
        />
      </td>

      <td className="px-4 py-3">
        <span className={p.status === "archived" ? "text-xs text-gray-500" : p.status === "draft" ? "text-xs text-amber-600" : "text-xs text-green-600"}>
          {p.status}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={!dirty || !valid || saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </Button>
          
          <input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <Button 
            size="sm" 
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="w-4 h-4 mr-1" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminProducts() {
  const { products, status, error, reload } = useCatalog();
  const [mode, setMode] = useState<"list" | "create">("list");
  
  const [newProduct, setNewProduct] = useState({ 
    name: "", 
    slug: "", 
    price: "", 
    stock: "", 
    size: "", // Added size
    category: "haircare",
    shortDescription: "",
    description: ""
  });
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewProductImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await adminCreateProduct({ 
        ...newProduct, 
        price: Number(newProduct.price), 
        stock: Number(newProduct.stock),
        status: "active",
        low_stock_threshold: 5
      });

      if (newProductImage) {
        const formData = new FormData();
        formData.append("file", newProductImage);
        formData.append("product_slug", newProduct.slug);
        await adminProductImages(formData);
      }

      toast.success("Product created successfully!");
      setMode("list");
      setNewProductImage(null);
      setPreviewUrl(null);
      setNewProduct({ name: "", slug: "", price: "", stock: "", size: "", category: "haircare", shortDescription: "", description: "" });
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
      description="Manage price, stock, and images. Images are hosted on Cloudinary."
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
            
            {/* ADDED SIZE FIELD */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Size (Optional)</label>
                <input className="input-base w-full" placeholder="e.g. 250ml, Standard" value={newProduct.size} onChange={e => setNewProduct({...newProduct, size: e.target.value})} />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Category</label>
                <select className="input-base w-full" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})}>
                  <option value="haircare">Haircare</option>
                  <option value="tools">Tools</option>
                  <option value="accessories">Accessories</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Product Image (Optional)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded-md shadow-sm" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-cream flex items-center justify-center">
                    <ImagePlus className="w-6 h-6 text-brown" />
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {newProductImage ? "Change Image" : "Click to select a JPG, PNG or WebP"}
                </span>
              </div>
              <input 
                type="file" 
                accept="image/jpeg, image/png, image/webp"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
              />
            </div>

            <div className="pt-4 flex gap-2">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Creating..." : "Save Product"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setMode("list"); setNewProductImage(null); setPreviewUrl(null); }}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </AdminPage>
  );
}