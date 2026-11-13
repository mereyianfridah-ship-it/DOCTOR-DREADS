import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminAddTiktok, adminDeleteTiktok, adminTiktokVideos, adminUpdateTiktok } from "../../api/endpoints";
import type { AdminTiktokVideo } from "../../api/endpoints";
import { AdminPage } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { ConfirmAction } from "../../components/common/ConfirmAction";
import { QueryState } from "../../components/common/QueryState";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";

export default function AdminTiktok() {
  const { data, loading, error, reload } = useAsync((s) => adminTiktokVideos(s), []);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const videos = data ?? [];

  const add = async () => {
    if (!url.trim()) return;
    setAdding(true);
    try {
      await adminAddTiktok({ url: url.trim(), title: title.trim() });
      setUrl("");
      setTitle("");
      toast.success("Video added as a draft. Publish it when you are ready.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setAdding(false);
    }
  };

  const togglePublished = async (v: AdminTiktokVideo) => {
    setBusy(v.id);
    try {
      await adminUpdateTiktok(v.id, { published: !v.published });
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (v: AdminTiktokVideo) => {
    setBusy(v.id);
    try {
      await adminDeleteTiktok(v.id);
      toast.success("Video removed.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  // Swap two neighbours, then renumber so every video has a distinct position.
  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= videos.length) return;
    const next = [...videos];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setBusy(next[index]!.id);
    try {
      for (let i = 0; i < next.length; i++) {
        if (next[i]!.sortOrder !== i) await adminUpdateTiktok(next[i]!.id, { sortOrder: i });
      }
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminPage
      title="TikTok videos"
      description="Link TikTok videos for the website. Only the link is stored; videos are never downloaded. New videos start as drafts."
    >
      <form
        onSubmit={(e) => { e.preventDefault(); void add(); }}
        className="mb-6 grid gap-3 rounded-2xl border border-charcoal/10 bg-white p-6 sm:grid-cols-[2fr_1fr_auto] sm:items-end"
      >
        <div>
          <label htmlFor="tt-url" className="mb-1 block text-sm font-medium">Video link</label>
          <input id="tt-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.tiktok.com/@user/video/123456789" className="input-base" />
        </div>
        <div>
          <label htmlFor="tt-title" className="mb-1 block text-sm font-medium">Title (optional)</label>
          <input id="tt-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} className="input-base" />
        </div>
        <Button type="submit" disabled={adding || !url.trim()}>{adding ? "Adding…" : "Add video"}</Button>
      </form>

      <QueryState loading={loading} error={error} onRetry={reload}>
        {videos.length === 0 && (
          <p className="rounded-2xl border border-charcoal/10 bg-white px-4 py-8 text-center text-sm text-charcoal/60">No TikTok videos yet.</p>
        )}
        <ul className="space-y-3">
          {videos.map((v, i) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-charcoal/10 bg-white p-4">
              <div className="min-w-0">
                <p className="font-medium">{v.title || "Untitled video"}</p>
                <a href={v.url} target="_blank" rel="noopener noreferrer" className="block max-w-md truncate text-sm text-charcoal/65 underline">{v.url}</a>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={v.published ? "Published" : "Draft"} tone={v.published ? "olive" : "grey"} />
                <Button size="sm" variant="ghost" aria-label="Move up" disabled={busy !== null || i === 0} onClick={() => void move(i, -1)}>↑</Button>
                <Button size="sm" variant="ghost" aria-label="Move down" disabled={busy !== null || i === videos.length - 1} onClick={() => void move(i, 1)}>↓</Button>
                <Button size="sm" variant="outline" disabled={busy === v.id} onClick={() => void togglePublished(v)}>{v.published ? "Unpublish" : "Publish"}</Button>
                <ConfirmAction label="Remove" message="Remove this video from the list? This cannot be undone." confirmLabel="Yes, remove" busy={busy === v.id} onConfirm={() => remove(v)} />
              </div>
            </li>
          ))}
        </ul>
      </QueryState>
    </AdminPage>
  );
}
