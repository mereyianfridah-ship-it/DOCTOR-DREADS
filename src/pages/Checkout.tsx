import { ProductImage } from "../components/common/ProductImage";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Smartphone, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { ApiError, errorMessage } from "../api/client";
import { createOrder } from "../api/endpoints";
import { Button, ButtonLink } from "../components/common/Button";
import { DemoNotice } from "../components/common/DemoNotice";
import { EmptyState } from "../components/common/EmptyState";
import { FormField } from "../components/common/FormField";
import { PageHeader } from "../components/common/PageHeader";
import { QueryState } from "../components/common/QueryState";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useCatalog } from "../context/CatalogContext";
import { formatKSh } from "../utils/format";
import { rememberGuestEmail } from "../utils/guestAccess";
import { phoneSchema } from "../utils/validation";

const schema = z
  .object({
    name: z.string().trim().min(2, "Please enter your full name"),
    phone: phoneSchema,
    email: z.string().trim().email("Enter a valid email address"),
    method: z.enum(["delivery", "collection"]),
    area: z.string(),
    address: z.string().trim(),
    payment: z.enum(["mpesa", "card"]),
  })
  .superRefine((v, ctx) => {
    if (v.method === "delivery") {
      if (!v.area) ctx.addIssue({ code: "custom", path: ["area"], message: "Select a delivery area" });
      if (v.address.length < 5) ctx.addIssue({ code: "custom", path: ["address"], message: "Enter your delivery address" });
    }
  });
type Values = z.infer<typeof schema>;

export default function Checkout() {
  const { status, error, reload, rules } = useCatalog();
  return (
    <>
      <PageHeader title="Checkout" description="Full payment is required online before an order is processed." />
      <section className="section">
        <div className="container-page">
          <QueryState loading={status === "loading"} error={status === "error" ? error : null} onRetry={() => void reload()}>
            {rules && <CheckoutForm rules={rules} />}
          </QueryState>
        </div>
      </section>
    </>
  );
}

function CheckoutForm({ rules }: { rules: NonNullable<ReturnType<typeof useCatalog>["rules"]> }) {
  const { lines, subtotal, clear } = useCart();
  const { reload } = useCatalog();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [stockProblems, setStockProblems] = useState<Record<string, string>>({});
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.fullName ?? "", phone: user?.phone ?? "", email: user?.email ?? "", method: "delivery", area: "", address: "", payment: "mpesa" },
  });
  const method = useWatch({ control, name: "method" });
  const area = useWatch({ control, name: "area" });
  const payment = useWatch({ control, name: "payment" });

  // Refresh stock/prices when checkout opens so the customer isn't told about stale availability.
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Display only: the server recalculates prices and the delivery fee from its own records.
  const fee = method === "delivery" ? (rules.checkout.deliveryAreas.find((a) => a.id === area)?.fee ?? 0) : 0;
  const total = subtotal + fee;
  const nameOf = useMemo(() => new Map(lines.map((l) => [l.product.slug, l.product.name])), [lines]);

  if (lines.length === 0) {
    return <EmptyState icon={<ShoppingBag className="h-7 w-7" />} title="Your cart is empty" description="Add products before checking out." action={<ButtonLink to="/shop">Continue Shopping</ButtonLink>} />;
  }

  const onSubmit = async (v: Values) => {
    setSubmitting(true);
    setFormError(null);
    setStockProblems({});
    try {
      const r = await createOrder({
        name: v.name, phone: v.phone, email: v.email, method: v.method, payment: v.payment,
        ...(v.method === "delivery" ? { area: v.area, address: v.address } : {}),
        items: lines.map((l) => ({ productId: l.product.slug, quantity: l.quantity })),
      });
      rememberGuestEmail("order", r.order.reference, v.email);
      clear();
      toast.success("Order reserved. Payment is still required.");
      navigate(`/orders/${r.order.reference}`);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.fields) {
        setStockProblems(e.fields);
        void reload();
        setFormError("Some items are no longer available in the quantity you chose. Please adjust your cart.");
      } else if (e instanceof ApiError && e.fields) {
        for (const [k, msg] of Object.entries(e.fields)) {
          if (["name", "phone", "email", "method", "area", "address", "payment"].includes(k)) setError(k as keyof Values, { message: msg });
        }
        setFormError(e.message);
      } else {
        setFormError(errorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-10 lg:grid-cols-[1fr_400px]">
      <div className="space-y-10">
        <fieldset className="space-y-5">
          <legend className="mb-2 text-2xl font-display">Your details</legend>
          <FormField label="Full name" htmlFor="k-name" error={errors.name?.message}>
            <input id="k-name" autoComplete="name" className={`input-base ${errors.name ? "input-error" : ""}`} {...register("name")} />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField label="Phone number" htmlFor="k-phone" error={errors.phone?.message} hint="Used for M-Pesa and delivery updates">
              <input id="k-phone" type="tel" autoComplete="tel" placeholder="e.g. 0712 345 678" className={`input-base ${errors.phone ? "input-error" : ""}`} {...register("phone")} />
            </FormField>
            <FormField label="Email" htmlFor="k-email" error={errors.email?.message}>
              <input id="k-email" type="email" autoComplete="email" className={`input-base ${errors.email ? "input-error" : ""}`} {...register("email")} />
            </FormField>
          </div>
          {!user && <p className="text-xs text-charcoal/55">Guest checkout: you can look up this order later with its reference and this email.</p>}
        </fieldset>

        <fieldset className="space-y-5">
          <legend className="mb-2 text-2xl font-display">Delivery or collection</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["delivery", "collection"] as const).map((m) => (
              <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${method === m ? "border-gold bg-gold/10" : "border-charcoal/20 bg-white"}`}>
                <input type="radio" value={m} className="accent-[#79543B]" {...register("method")} />
                <span className="text-sm font-medium">{m === "delivery" ? "Delivery" : (rules.checkout.collectionLabel ?? "Collection")}</span>
              </label>
            ))}
          </div>
          {method === "delivery" && (
            <>
              <FormField label="Delivery area" htmlFor="k-area" error={errors.area?.message}>
                <select id="k-area" className={`input-base ${errors.area ? "input-error" : ""}`} {...register("area")}>
                  <option value="">Select an area</option>
                  {rules.checkout.deliveryAreas.map((a) => (
                    <option key={a.id} value={a.id}>{a.label} ({formatKSh(a.fee)})</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Delivery address" htmlFor="k-address" error={errors.address?.message}>
                <textarea id="k-address" rows={3} autoComplete="street-address" className={`input-base ${errors.address ? "input-error" : ""}`} {...register("address")} />
              </FormField>
              <p className="text-xs text-charcoal/55">Delivery charges are sample values pending confirmation by the business.</p>
            </>
          )}
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="mb-2 text-2xl font-display">Payment</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${payment === "mpesa" ? "border-gold bg-gold/10" : "border-charcoal/20 bg-white"}`}>
              <input type="radio" value="mpesa" className="accent-[#79543B]" {...register("payment")} />
              <Smartphone className="h-5 w-5" aria-hidden /> <span className="text-sm font-medium">M-Pesa</span>
            </label>
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${payment === "card" ? "border-gold bg-gold/10" : "border-charcoal/20 bg-white"}`}>
              <input type="radio" value="card" className="accent-[#79543B]" {...register("payment")} />
              <CreditCard className="h-5 w-5" aria-hidden /> <span className="text-sm font-medium">Card</span>
            </label>
          </div>
          <DemoNotice>
            Online orders must be <strong>paid in full</strong> before they are processed. There is no cash on delivery or collection. <strong>Online payment is not available yet</strong>: placing
            this order reserves your items for a short time, but it will not be processed until payment is received.
          </DemoNotice>
        </fieldset>
      </div>

      <aside className="h-fit rounded-2xl border border-charcoal/10 bg-white p-6 lg:sticky lg:top-28">
        <h2 className="text-2xl">Order summary</h2>
        <ul className="mt-5 divide-y divide-charcoal/10">
          {lines.map((l) => (
            <li key={l.product.slug} className="flex items-center gap-3 py-3">
              <ProductImage src={l.product.images[0]} alt={l.product.name} category={l.product.category} className="h-14 w-14 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{l.product.name}</p>
                <p className="text-xs text-charcoal/60">Qty {l.quantity}</p>
                {stockProblems[l.product.slug] && <p role="alert" className="text-xs font-semibold text-red-700">{stockProblems[l.product.slug]}</p>}
              </div>
              <p className="text-sm font-semibold">{formatKSh(l.lineTotal)}</p>
            </li>
          ))}
        </ul>
        {Object.keys(stockProblems).filter((k) => !nameOf.has(k)).map((k) => (
          <p key={k} role="alert" className="mt-2 text-xs font-semibold text-red-700">{k}: {stockProblems[k]}</p>
        ))}
        <dl className="mt-4 space-y-2 border-t border-charcoal/10 pt-4 text-sm">
          <div className="flex justify-between"><dt>Product subtotal</dt><dd>{formatKSh(subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Delivery charge</dt><dd>{method === "collection" ? "Free (collection)" : area ? formatKSh(fee) : "Select area"}</dd></div>
        </dl>
        <div className="mt-4 flex justify-between border-t border-charcoal/10 pt-4 text-lg font-bold">
          <span>Total</span><span>{formatKSh(total)}</span>
        </div>
        {formError && <p role="alert" className="mt-4 text-sm text-red-700">{formError}</p>}
        <Button type="submit" size="lg" fullWidth className="mt-6" disabled={submitting}>
          {submitting ? "Reserving…" : "Reserve my order"}
        </Button>
        <p className="mt-2 text-center text-xs text-charcoal/55">Payment is required before processing.</p>
        <ButtonLink to="/cart" variant="ghost" fullWidth className="mt-2">Back to cart</ButtonLink>
      </aside>
    </form>
  );
}
