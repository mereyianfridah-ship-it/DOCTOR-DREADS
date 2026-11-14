import { useState } from "react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { adminDeleteReview, adminReviews, adminSetReviewStatus } from "../../api/endpoints";
import { AdminPage, Pager } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { QueryState } from "../../components/common/QueryState";
import { StarRating } from "../../components/common/StarRating";
import { StatusBadge } from "../../components/common/StatusBadge";
import { useAsync } from "../../hooks/useAsync";
import type { Tone } from "../../utils/status";
import { formatDateTime } from "../../utils/format";
import type { ReviewStatus } from "../../types";

const PAGE = 50;
const FILTERS: { value: ReviewStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "pending", label: "Awaiting approval" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];
const BADGE: Record<ReviewStatus, { label: string; tone: Tone }> = {
  pending: { label: "Awaiting approval", tone: "gold" },
  approved: { label: "Approved", tone: "olive" },
  rejected: { label: "Rejected", tone: "grey" },
};

export default function AdminReviews() {
  const [filter, setFilter] = useState<ReviewStatus | "">("pending");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const { data, loading, error, reload } = useAsync(
    (s) => adminReviews({ status: filter || undefined, limit: PAGE, offset }, s),
    [filter, offset]
  );

  const act = async (id: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(id);
    try {
      await fn();
      toast.success(ok);
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const rows = data ?? [];
  return (
    <AdminPage title="Reviews" description="Reviews sent from the website. Nothing is shown to visitors until you approve it.">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filter reviews">
        {FILTERS.map((f) => (
          <Button key={f.label} size="sm" variant={filter === f.value ? "secondary" : "outline"} onClick={() => { setFilter(f.value); setOffset(0); }}>
            {f.label}
          </Button>
        ))}
      </div>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {rows.length === 0 && <p className="rounded-2xl border border-charcoal/10 bg-white px-4 py-8 text-center text-sm text-charcoal/60">No reviews here.</p>}
        <ul className="space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border border-charcoal/10 bg-white p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl">{r.name}</h2>
                    {r.rating ? <StarRating value={r.rating} /> : null}
                  </div>
                  <p className="text-sm text-charcoal/65">
                    {r.detail}
                    {r.email ? <> · <a className="underline" href={`mailto:${r.email}`}>{r.email}</a></> : null}
                    {r.created_at ? ` · ${formatDateTime(r.created_at)}` : ""}
                  </p>
                </div>
                <StatusBadge label={BADGE[r.status].label} tone={BADGE[r.status].tone} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm">{r.quote}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {r.status !== "approved" && (
                  <Button size="sm" disabled={busy === r.id} onClick={() => void act(r.id, () => adminSetReviewStatus(r.id, "approved"), "Review approved")}>Approve</Button>
                )}
                {r.status !== "rejected" && (
                  <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => void act(r.id, () => adminSetReviewStatus(r.id, "rejected"), "Review rejected")}>Reject</Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === r.id}
                  onClick={() => { if (window.confirm("Delete this review permanently?")) void act(r.id, () => adminDeleteReview(r.id), "Review deleted"); }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <Pager offset={offset} pageSize={PAGE} count={rows.length} onChange={setOffset} />
      </QueryState>
    </AdminPage>
  );
}
