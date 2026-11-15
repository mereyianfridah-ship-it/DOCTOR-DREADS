import { useState } from "react";
import { Download } from "lucide-react";
import { adminReport } from "../../api/endpoints";
import type { AdminReport } from "../../api/endpoints";
import { AdminPage, DataTable } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { QueryState } from "../../components/common/QueryState";
import { useCatalog } from "../../context/CatalogContext";
import { useAsync } from "../../hooks/useAsync";
import { downloadCsv } from "../../utils/csv";
import { formatKSh } from "../../utils/format";
import { stylistLabel } from "../../utils/stylist";

const isoDay = (d: Date) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10); // East Africa Time
const daysAgo = (n: number) => isoDay(new Date(Date.now() - n * 86_400_000));

const PRESETS = [
  { label: "Last 7 days", from: () => daysAgo(6) },
  { label: "Last 30 days", from: () => daysAgo(29) },
  { label: "Last 90 days", from: () => daysAgo(89) },
];

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-charcoal/10 bg-white p-5">
      <p className="text-sm text-charcoal/65">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-charcoal/55">{hint}</p>}
    </div>
  );
}

function Bars({ points, label }: { points: { day: string; value: number }[]; label: string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <figure aria-label={label} className="rounded-2xl border border-charcoal/10 bg-white p-5">
      <figcaption className="mb-3 text-sm font-medium">{label}</figcaption>
      <div className="flex h-32 items-end gap-px" role="img" aria-label={`${label}: ${points.reduce((a, p) => a + p.value, 0).toLocaleString()} in total`}>
        {points.map((p) => (
          <div key={p.day} title={`${p.day}: ${p.value.toLocaleString()}`} className="flex-1 rounded-t bg-gold" style={{ height: `${Math.max(p.value > 0 ? 3 : 0, (p.value / max) * 100)}%` }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-charcoal/55"><span>{points[0]?.day}</span><span>{points[points.length - 1]?.day}</span></div>
    </figure>
  );
}

const toRows = (r: AdminReport, stylists?: { id: string; name: string }[]): (string | number)[][] => [
  ["Dr Dread Kenya report", `${r.range.from} to ${r.range.to}`],
  [],
  ["SALES"], ["Orders", r.sales.orders], ["Revenue (KSh)", r.sales.revenue], ["Delivery fees (KSh)", r.sales.deliveryFees], ["Average order (KSh)", r.sales.averageOrder],
  ["Top products", "Units", "Revenue (KSh)"], ...r.sales.topProducts.map((p) => [p.name, p.units, p.revenue]),
  ["Daily sales", "Orders", "Revenue (KSh)"], ...r.sales.byDay.map((d) => [d.day, d.orders, d.revenue]),
  [],
  ["BOOKINGS"], ["Total", r.bookings.total], ["Cancellation rate (%)", r.bookings.cancellationRate], ["Deposits collected (KSh)", r.bookings.depositsCollected],
  ["Refunds due (KSh)", r.bookings.refundsDue], ["Refunds paid (KSh)", r.bookings.refundsPaid],
  ["By service", "Bookings", "Deposits (KSh)"], ...r.bookings.byService.map((s) => [s.name, s.bookings, s.deposits]),
  ["By stylist", "Bookings"], ...r.bookings.byStylist.map((s) => [stylistLabel(s.stylistId, stylists), s.bookings]),
  [],
  ["INVENTORY"], ["Products", r.inventory.products], ["Out of stock", r.inventory.outOfStock], ["Low stock", r.inventory.lowStock], ["Stock value (KSh)", r.inventory.stockValue],
  ["Needs attention", "Stock", "Threshold"], ...r.inventory.needsAttention.map((p) => [p.name, p.stock, p.threshold]),
];

export default function AdminReports() {
  const { rules } = useCatalog();
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(daysAgo(0));
  const { data, loading, error, reload } = useAsync((s) => adminReport({ from, to }, s), [from, to]);

  return (
    <AdminPage
      title="Reports"
      description="Sales, bookings and stock for a chosen period. Figures count paid orders and confirmed or completed bookings only."
      actions={data && <Button size="sm" variant="outline" onClick={() => downloadCsv(`report-${data.range.from}_to_${data.range.to}.csv`, toRows(data, rules?.stylists))}><Download className="mr-2 h-4 w-4" aria-hidden /> Download CSV</Button>}
    >
      <div className="mb-6 flex flex-wrap items-end gap-3">
        {PRESETS.map((p) => <Button key={p.label} size="sm" variant="outline" onClick={() => { setFrom(p.from()); setTo(daysAgo(0)); }}>{p.label}</Button>)}
        <label className="text-sm">From <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="input-base !w-auto !py-2" /></label>
        <label className="text-sm">To <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} className="input-base !w-auto !py-2" /></label>
      </div>
      <QueryState loading={loading} error={error} onRetry={reload}>
        {data && (
          <div className="space-y-10">
            <section aria-labelledby="perf">
              <h2 id="perf" className="mb-3 text-xl">Business performance</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Total income" value={formatKSh(data.performance.totalRevenue)} hint="Shop revenue + booking deposits" />
                <Stat label="Shop revenue" value={formatKSh(data.performance.productRevenue)} />
                <Stat label="Booking deposits" value={formatKSh(data.performance.bookingDeposits)} />
                <Stat label="New customers" value={data.performance.newCustomers} />
              </div>
            </section>

            <section aria-labelledby="sales">
              <h2 id="sales" className="mb-3 text-xl">Sales</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Paid orders" value={data.sales.orders} />
                <Stat label="Revenue" value={formatKSh(data.sales.revenue)} />
                <Stat label="Average order" value={formatKSh(data.sales.averageOrder)} />
                <Stat label="Delivery fees" value={formatKSh(data.sales.deliveryFees)} />
              </div>
              <div className="mt-4"><Bars label="Revenue per day (KSh)" points={data.sales.byDay.map((d) => ({ day: d.day, value: d.revenue }))} /></div>
              <h3 className="mb-2 mt-6 font-semibold">Best-selling products</h3>
              <DataTable head={["Product", "Units sold", "Revenue"]} empty={data.sales.topProducts.length ? undefined : "No paid orders in this period."}>
                {data.sales.topProducts.map((p) => <tr key={p.slug}><td className="px-4 py-3">{p.name}</td><td className="px-4 py-3">{p.units}</td><td className="px-4 py-3">{formatKSh(p.revenue)}</td></tr>)}
              </DataTable>
            </section>

            <section aria-labelledby="bk">
              <h2 id="bk" className="mb-3 text-xl">Bookings</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Bookings in period" value={data.bookings.total} hint={`${data.bookings.completed} completed`} />
                <Stat label="Cancellation rate" value={`${data.bookings.cancellationRate}%`} />
                <Stat label="Deposits collected" value={formatKSh(data.bookings.depositsCollected)} />
                <Stat label="Refunds due / paid" value={`${formatKSh(data.bookings.refundsDue)} / ${formatKSh(data.bookings.refundsPaid)}`} />
              </div>
              <div className="mt-4"><Bars label="Appointments per day" points={data.bookings.byDay.map((d) => ({ day: d.day, value: d.bookings }))} /></div>
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <DataTable head={["Service", "Bookings", "Deposits"]} empty={data.bookings.byService.length ? undefined : "No bookings."}>
                  {data.bookings.byService.map((s) => <tr key={s.name}><td className="px-4 py-3">{s.name}</td><td className="px-4 py-3">{s.bookings}</td><td className="px-4 py-3">{formatKSh(s.deposits)}</td></tr>)}
                </DataTable>
                <DataTable head={["Stylist", "Bookings"]} empty={data.bookings.byStylist.length ? undefined : "No bookings."}>
                  {data.bookings.byStylist.map((s) => <tr key={s.stylistId}><td className="px-4 py-3">{stylistLabel(s.stylistId, rules?.stylists)}</td><td className="px-4 py-3">{s.bookings}</td></tr>)}
                </DataTable>
              </div>
            </section>

            <section aria-labelledby="inv">
              <h2 id="inv" className="mb-3 text-xl">Inventory <span className="text-sm font-normal text-charcoal/55">(current, not period-based)</span></h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Stat label="Products" value={data.inventory.products} hint={`${data.inventory.units} units on hand`} />
                <Stat label="Stock value" value={formatKSh(data.inventory.stockValue)} hint="At selling price" />
                <Stat label="Low stock" value={data.inventory.lowStock} />
                <Stat label="Out of stock" value={data.inventory.outOfStock} />
              </div>
              <h3 className="mb-2 mt-6 font-semibold">Needs restocking</h3>
              <DataTable head={["Product", "In stock", "Alert at"]} empty={data.inventory.needsAttention.length ? undefined : "Everything is above its low-stock level."}>
                {data.inventory.needsAttention.map((p) => <tr key={p.slug}><td className="px-4 py-3">{p.name}</td><td className={`px-4 py-3 ${p.stock === 0 ? "font-semibold text-red-700" : ""}`}>{p.stock}</td><td className="px-4 py-3">{p.threshold}</td></tr>)}
              </DataTable>
            </section>
          </div>
        )}
      </QueryState>
    </AdminPage>
  );
}
