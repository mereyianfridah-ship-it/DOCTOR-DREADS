import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import {
  adminDeleteGalleryPhoto,
  adminResetSiteImage,
  adminSetServiceImage,
  adminSetSiteImage,
  adminUploadGalleryPhoto,
  getGallery,
  getSiteImages,
} from "../../api/endpoints";
import { AdminPage } from "../../components/admin/AdminUi";
import { FilePickButton } from "../../components/admin/FilePickButton";
import { Button } from "../../components/common/Button";
import { PreviewImage } from "../../components/common/PreviewImage";
import { QueryState } from "../../components/common/QueryState";
import { SITE_IMAGE_INFO, type SiteImageSlotInfo } from "../../config/siteImages";
import { useCatalog } from "../../context/CatalogContext";
import { useAsync } from "../../hooks/useAsync";
import { invalidateSiteImages } from "../../hooks/useSiteImages";
import { imageFileProblem, optimizedUrl } from "../../utils/cloudinary";

/** Runs an upload/reset with a busy flag and toasts; returns true on success. */
function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, fn: () => Promise<unknown>, ok: string): Promise<boolean> => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
      return true;
    } catch (e) {
      toast.error(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

function SlotCard({ info, current, onChanged }: { info: SiteImageSlotInfo; current?: { url: string; alt: string }; onChanged: () => void }) {
  const [alt, setAlt] = useState(current?.alt ?? "");
  const { busy, run } = useAction();
  const working = busy !== null;

  const pick = async (file: File) => {
    const problem = imageFileProblem(file);
    if (problem) return void toast.error(problem);
    const ok = await run("up", () => adminSetSiteImage(info.slot, file, info.decorative ? "" : alt.trim()), `${info.label} updated.`);
    if (ok) { invalidateSiteImages(); onChanged(); }
  };
  const reset = async () => {
    if (!window.confirm(`Go back to the default image for “${info.label}”?`)) return;
    const ok = await run("reset", () => adminResetSiteImage(info.slot), `${info.label} reset to the default.`);
    if (ok) { invalidateSiteImages(); onChanged(); }
  };

  return (
    <li className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
      <PreviewImage
        src={current ? optimizedUrl(current.url, 800) : info.fallback}
        alt={current ? `Current ${info.label}` : `Default ${info.label}`}
        className="h-44 w-full bg-charcoal/10 object-cover"
        loading="lazy"
      />
      <div className="space-y-3 p-5">
        <div>
          <h3 className="text-lg">{info.label}</h3>
          <p className="text-xs text-charcoal/60">{info.where}</p>
          <p className="mt-1 text-xs text-charcoal/55">{info.hint}</p>
          <p className="mt-1 text-xs font-semibold text-brown">{current ? "Your photo is live" : "Showing the default image"}</p>
        </div>
        {!info.decorative && (
          <div>
            <label htmlFor={`alt-${info.slot}`} className="mb-1 block text-xs font-medium">Describe the photo <span className="font-normal text-charcoal/50">(for screen readers; saved with the next upload)</span></label>
            <input id={`alt-${info.slot}`} maxLength={160} className="input-base !py-2" value={alt} onChange={(e) => setAlt(e.target.value)} />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <FilePickButton label={working && busy === "up" ? "Uploading…" : current ? "Replace photo" : "Upload photo"} variant="primary" disabled={working} onFile={(f) => void pick(f)} />
          {current && <Button size="sm" variant="ghost" disabled={working} onClick={() => void reset()}>{busy === "reset" ? "Resetting…" : "Use default"}</Button>}
        </div>
      </div>
    </li>
  );
}

function SiteImagesSection() {
  const { data, loading, error, reload } = useAsync((s) => getSiteImages(s), []);
  return (
    <section aria-labelledby="site-images">
      <h2 id="site-images" className="text-2xl">Website photos</h2>
      <p className="mb-4 mt-1 max-w-2xl text-sm text-charcoal/65">The big photos on the home and About pages. Changes appear on the website within a minute.</p>
      <QueryState loading={loading} error={error} onRetry={reload}>
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {SITE_IMAGE_INFO.map((info) => (
            <SlotCard key={`${info.slot}-${data?.[info.slot]?.url ?? ""}`} info={info} current={data?.[info.slot]} onChanged={reload} />
          ))}
        </ul>
      </QueryState>
    </section>
  );
}

function ServicePhotosSection() {
  const { services, status, error, reload } = useCatalog();
  const { busy, run } = useAction();
  const pick = async (slug: string, name: string, file: File) => {
    const problem = imageFileProblem(file);
    if (problem) return void toast.error(problem);
    if (await run(slug, () => adminSetServiceImage(slug, file), `${name} photo updated.`)) await reload();
  };
  return (
    <section aria-labelledby="service-photos">
      <h2 id="service-photos" className="text-2xl">Service photos</h2>
      <p className="mb-4 mt-1 max-w-2xl text-sm text-charcoal/65">Shown on the Services page, the home page and each service&apos;s own page. Landscape photos work best.</p>
      <QueryState loading={status === "loading"} error={status === "error" ? error : null} onRetry={() => void reload()}>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {services.map((s) => (
            <li key={s.slug} className="flex items-center gap-4 rounded-2xl border border-charcoal/10 bg-white p-4">
              <PreviewImage src={optimizedUrl(s.image, 300)} alt="" className="h-20 w-24 shrink-0 rounded-lg bg-charcoal/10 object-cover" loading="lazy" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{s.name}</p>
                <div className="mt-2">
                  <FilePickButton label={busy === s.slug ? "Uploading…" : "Replace photo"} disabled={busy !== null} onFile={(f) => void pick(s.slug, s.name, f)} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </section>
  );
}

function GallerySection() {
  const { data, loading, error, reload } = useAsync((s) => getGallery(s), []);
  const { busy, run } = useAction();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const photos = (data ?? []).filter((g) => !g.isVideo);
  const categories = [...new Set((data ?? []).map((g) => g.category))].sort();

  const add = async (file: File) => {
    const problem = imageFileProblem(file);
    if (problem) return void toast.error(problem);
    if (title.trim().length < 1 || category.trim().length < 1) return void toast.error("Add a title and a category first, then choose the photo.");
    if (await run("add", () => adminUploadGalleryPhoto(file, title.trim(), category.trim()), "Photo added to the gallery.")) {
      setTitle("");
      reload();
    }
  };
  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete “${name}” from the gallery? This can't be undone.`)) return;
    if (await run(id, () => adminDeleteGalleryPhoto(id), "Photo deleted.")) reload();
  };

  return (
    <section aria-labelledby="gallery-photos">
      <h2 id="gallery-photos" className="text-2xl">Gallery</h2>
      <p className="mb-4 mt-1 max-w-2xl text-sm text-charcoal/65">Add your best work. Photos appear on the Gallery page and the home page preview.</p>
      <div className="mb-6 grid gap-3 rounded-2xl border border-charcoal/10 bg-white p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="g-title" className="mb-1 block text-xs font-medium">Title</label>
          <input id="g-title" maxLength={120} className="input-base !py-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Starter locs, 6 weeks" />
        </div>
        <div>
          <label htmlFor="g-category" className="mb-1 block text-xs font-medium">Category</label>
          <input id="g-category" list="g-categories" maxLength={60} className="input-base !py-2" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Salon" />
          <datalist id="g-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <FilePickButton label={busy === "add" ? "Uploading…" : "Choose photo & add"} variant="primary" disabled={busy !== null} onFile={(f) => void add(f)} />
      </div>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {photos.length === 0 && <p className="rounded-2xl border border-charcoal/10 bg-white px-4 py-8 text-center text-sm text-charcoal/60">No gallery photos yet.</p>}
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {photos.map((g) => (
            <li key={g.id} className="overflow-hidden rounded-xl border border-charcoal/10 bg-white">
              <PreviewImage src={optimizedUrl(g.image, 500)} alt={g.title} className="aspect-square w-full bg-charcoal/10 object-cover" loading="lazy" />
              <div className="p-3">
                <p className="truncate text-sm font-medium">{g.title}</p>
                <p className="text-xs text-charcoal/55">{g.category}</p>
                <Button size="sm" variant="ghost" className="mt-2" disabled={busy !== null} onClick={() => void remove(g.id, g.title)}>{busy === g.id ? "Deleting…" : "Delete"}</Button>
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </section>
  );
}

export default function AdminImages() {
  return (
    <AdminPage title="Images" description="Change the website's photos without a developer. JPG, PNG or WebP, up to 10 MB each. Product photos are managed on the Products page.">
      <div className="space-y-12">
        <SiteImagesSection />
        <ServicePhotosSection />
        <GallerySection />
      </div>
    </AdminPage>
  );
}
