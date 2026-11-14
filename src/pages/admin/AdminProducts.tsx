import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { errorMessage } from "../../api/client";
import {
  adminCreateProduct,
  adminDeleteProductImage,
  adminProductImages,
  adminProducts,
  adminReorderProductImages,
  adminUpdateProduct,
  getCategories,
  type Category,
} from "../../api/endpoints";
import { AdminPage, DataTable } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { ProductImage } from "../../components/common/ProductImage";
import { parseWhole } from "../../utils/numbers";
import type { Product } from "../../types";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES = 5;
const ACCEPT = "image/jpeg,image/png,image/webp";

type Status = Product["status"];

function checkFile(file: File): string | null {
  if (!ACCEPT.split(",").includes(file.type)) return "Only JPG, PNG or WebP photos are allowed.";
  if (file.size > MAX_BYTES) return "Each photo must be 10 MB or smaller.";
  return null;
}

function ProductRow({ p, categories, onChanged }: { p: Product; categories: Category[]; onChanged: () => Promise<void> }) {
  const [name, setName] = useState(p.name);
  const [price, setPrice] = useState(String(p.price));
  const [stock, setStock] = useState(String(p.stock));
  const [status, setStatus] = useState<Status>(p.status);
  const [category, setCategory] = useState(p.category);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const priceN = parseWhole(price);
  const stockN = parseWhole(stock);
  const valid = priceN !== null && stockN !== null && name.trim().length > 0;
  const dirty =
    name !== p.name || price !== String(p.price) || stock !== String(p.stock) || status !== p.status || category !== p.category;
  const realImages = p.images.filter((u) => !u.startsWith("/images/"));

  const save = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await adminUpdateProduct(p.slug, { name: name.trim(), price: priceN!, stock: stockN!, status, category });
      await onChanged();
      toast.success(`${name.trim()} updated.`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    const problem = checkFile(file);
    if (problem) return void toast.error(problem);
    if (realImages.length >= MAX_IMAGES) return void toast.error(`A product can have at most ${MAX_IMAGES} photos.`);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("product_slug", p.slug);
      await adminProductImages(fd);
      await onChanged();
      toast.success("Photo uploaded.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const makePrimary = async (url: string) => {
    try {
      await adminReorderProductImages(p.slug, [url, ...p.images.filter((u) => u !== url)]);
      await onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (url: string) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await adminDeleteProductImage(p.slug, url);
      await onChanged();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <tr>
      <td className="px-4 py-3">
        <input aria-label={`Name for ${p.slug}`} className="input-base w-full !py-2" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="mt-1 text-xs text-charcoal/55">{p.slug}</div>
        <select aria-label={`Category for ${p.name}`} className="input-base mt-2 !py-1 text-xs" value={category} onChange={(e) => setCategory(e.target.value)}>
          {!categories.some((c) => c.name === category) && <option value={category}>{category}</option>}
          {categories.map((c) => (
            <option key={c.slug} value={c.name}>{c.name}</option>
          ))}
        </select>
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {p.images.map((url, i) => (
            <div key={url} className="relative">
              <ProductImage src={url} alt={`${p.name} photo ${i + 1}`} name={p.name} category={p.category} className="h-12 w-12 rounded-lg border object-cover" />
              {!url.startsWith("/images/") && (
                <div className="mt-1 flex justify-center gap-1">
                  {i !== 0 && (
                    <button type="button" aria-label="Make primary photo" title="Make primary" onClick={() => void makePrimary(url)}>
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button type="button" aria-label="Delete photo" title="Delete" onClick={() => void remove(url)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </button>
                </div>
              )}
              {i === 0 && p.images.length > 1 && <span className="absolute -top-1 -left-1 rounded bg-charcoal px-1 text-[9px] text-offwhite">Main</span>}
            </div>
          ))}
          {p.images.length === 0 && <span className="text-xs text-charcoal/50">No photos</span>}
        </div>
        <input type="file" accept={ACCEPT} className="hidden" ref={fileRef} onChange={upload} />
        <Button size="sm" variant="outline" className="mt-2" disabled={uploading || realImages.length >= MAX_IMAGES} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="mr-1 h-4 w-4" />
          {uploading ? "Uploading…" : "Add photo"}
        </Button>
        <p className="mt-1 text-[10px] text-charcoal/45">JPG, PNG or WebP, up to 10 MB, max {MAX_IMAGES}.</p>
      </td>

      <td className="px-4 py-3">
        <input aria-label={`Price (KSh) for ${p.name}`} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className={`input-base !w-24 !py-2 ${priceN === null ? "input-error" : ""}`} />
      </td>
      <td className="px-4 py-3">
        <input aria-label={`Stock for ${p.name}`} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} className={`input-base !w-20 !py-2 ${stockN === null ? "input-error" : ""}`} />
      </td>
      <td className="px-4 py-3">
        <select aria-label={`Status for ${p.name}`} className="input-base !py-2" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          <option value="draft">draft (hidden)</option>
          <option value="active">active (visible)</option>
          <option value="archived">archived (hidden)</option>
        </select>
      </td>
      <td className="px-4 py-3">
        <Button size="sm" disabled={!dirty || !valid || busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save"}
        </Button>
      </td>
    </tr>
  );
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<"" | Status>("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"list" | "create">("list");

  const load = useCallback(async () => {
    try {
      const [list, cats] = await Promise.all([adminProducts(filter ? { status: filter } : {}), getCategories()]);
      setProducts(list);
      setCategories(cats);
      setError("");
      setState("ready");
    } catch (e) {
      setError(errorMessage(e));
      setState("error");
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminPage title="Products" description="Manage details, price, stock, status and photos. Only active products appear in the shop.">
      {mode === "list" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select aria-label="Filter by status" className="input-base !py-2" value={filter} onChange={(e) => setFilter(e.target.value as "" | Status)}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <Button size="sm" onClick={() => setMode("create")}>Create Product</Button>
          </div>

          {state === "loading" ? (
            <div className="py-8 text-center text-charcoal/50">Loading products…</div>
          ) : state === "error" ? (
            <div className="py-8 text-center text-red-600">
              <p>{error}</p>
              <Button size="sm" onClick={() => void load()} className="mt-4">Retry</Button>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-300 py-12 text-center">
              <h3 className="text-lg font-semibold">No products {filter ? `with status “${filter}”` : "yet"}</h3>
              <p className="mt-1 text-sm text-gray-500">Create a product to get started.</p>
            </div>
          ) : (
            <DataTable head={["Product", "Photos", "Price (KSh)", "Stock", "Status", ""]}>
              {products.map((p) => (
                <ProductRow key={`${p.slug}-${p.images.join("|")}-${p.status}-${p.price}-${p.stock}-${p.name}-${p.category}`} p={p} categories={categories} onChanged={load} />
              ))}
            </DataTable>
          )}
        </div>
      ) : (
        <CreateProduct
          categories={categories}
          onDone={async () => {
            setMode("list");
            await load();
          }}
          onCancel={() => setMode("list")}
        />
      )}
    </AdminPage>
  );
}

function CreateProduct({ categories, onDone, onCancel }: { categories: Category[]; onDone: () => Promise<void>; onCancel: () => void }) {
  const [f, setF] = useState({ name: "", slug: "", price: "", stock: "", size: "", category: categories[0]?.slug ?? "", shortDescription: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Once the product exists, retries only re-attempt the photo so we never create it twice.
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (!f.category && categories[0]) setF((v) => ({ ...v, category: categories[0]!.slug })); }, [categories, f.category]);

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    const problem = checkFile(picked);
    if (problem) return void toast.error(problem);
    if (preview) URL.revokeObjectURL(preview);
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let slug = createdSlug;
    try {
      if (!slug) {
        const r = await adminCreateProduct({
          name: f.name.trim(),
          slug: f.slug || undefined,
          category: f.category,
          shortDescription: f.shortDescription,
          description: f.description,
          price: Number(f.price),
          stock: Number(f.stock),
          size: f.size || undefined,
          status: "active",
          low_stock_threshold: 5,
        });
        slug = r.product.slug;
        setCreatedSlug(slug);
      }
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("product_slug", slug);
        try {
          await adminProductImages(fd);
        } catch (err) {
          toast.error(`Product saved, but the photo failed: ${errorMessage(err)} Press Save again to retry the photo.`);
          return;
        }
      }
      toast.success("Product created.");
      await onDone();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xl font-bold">Create New Product</h2>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Product Name</label>
          <input required disabled={!!createdSlug} className="input-base w-full" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">URL Slug (optional, generated from the name if empty)</label>
          <input disabled={!!createdSlug} className="input-base w-full" placeholder="e.g. locs-repair-oil" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Price (KSh)</label>
            <input required disabled={!!createdSlug} type="number" min="0" className="input-base w-full" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Initial Stock</label>
            <input required disabled={!!createdSlug} type="number" min="0" className="input-base w-full" value={f.stock} onChange={(e) => setF({ ...f, stock: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Size (optional)</label>
            <input disabled={!!createdSlug} className="input-base w-full" placeholder="e.g. 250ml" value={f.size} onChange={(e) => setF({ ...f, size: e.target.value })} />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium">Category</label>
            <select required disabled={!!createdSlug} className="input-base w-full" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Short description</label>
          <input disabled={!!createdSlug} className="input-base w-full" value={f.shortDescription} onChange={(e) => setF({ ...f, shortDescription: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea disabled={!!createdSlug} rows={4} className="input-base w-full" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Product photo (optional, JPG/PNG/WebP up to 10 MB)</label>
          <div onClick={() => fileRef.current?.click()} className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 p-6 transition hover:bg-gray-50">
            {preview ? <img src={preview} alt="Preview" className="h-24 w-24 rounded-md object-cover shadow-sm" /> : <ImagePlus className="h-6 w-6 text-brown" />}
            <span className="text-sm font-medium text-gray-700">{file ? "Change photo" : "Click to select a photo"}</span>
          </div>
          <input type="file" accept={ACCEPT} className="hidden" ref={fileRef} onChange={pick} />
        </div>
        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={saving}>{saving ? "Saving…" : createdSlug ? "Retry photo" : "Save Product"}</Button>
          <Button type="button" variant="outline" onClick={createdSlug ? () => void onDone() : onCancel}>{createdSlug ? "Close" : "Cancel"}</Button>
        </div>
      </form>
    </div>
  );
}
