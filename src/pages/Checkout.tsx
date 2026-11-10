import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CreditCard, Smartphone, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "../components/common/Button";
import { DemoNotice } from "../components/common/DemoNotice";
import { EmptyState } from "../components/common/EmptyState";
import { FormField } from "../components/common/FormField";
import { PageHeader } from "../components/common/PageHeader";
import { siteConfig } from "../config/site";
import { useCart } from "../context/CartContext";
import { formatKSh } from "../utils/format";
import { phoneSchema } from "../utils/validation";

const areaIds = siteConfig.checkout.deliveryAreas.map((a) => a.id);

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
      if (!areaIds.includes(v.area)) ctx.addIssue({ code: "custom", path: ["area"], message: "Select a delivery area" });
      if (v.address.length < 5) ctx.addIssue({ code: "custom", path: ["address"], message: "Enter your delivery address" });
    }
  });
type Values = z.infer<typeof schema>;

export default function Checkout() {
  const { lines, subtotal } = useCart();
  const [notice, setNotice] = useState<null | "mpesa" | "card">(null);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", phone: "", email: "", method: "delivery", area: "", address: "", payment: "mpesa" },
  });
  const method = useWatch({ control, name: "method" });
  const area = useWatch({ control, name: "area" });
  const payment = useWatch({ control, name: "payment" });

  const fee = method === "delivery" ? (siteConfig.checkout.deliveryAreas.find((a) => a.id === area)?.fee ?? 0) : 0;
  const total = subtotal + fee;

  if (lines.length === 0) {
    return (
      <>
        <PageHeader title="Checkout" />
        <EmptyState icon={<ShoppingBag className="h-7 w-7" />} title="Your cart is empty" description="Add products before checking out." action={<ButtonLink to="/shop">Continue Shopping</ButtonLink>} />
      </>
    );
  }

  const onSubmit = (v: Values) => {
    // TODO(backend): create order + start M-Pesa STK push / card session. Nothing is sent now.
    setNotice(v.payment);
    toast.info("Demonstration only: no payment was taken and no order was placed.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <PageHeader title="Checkout" description="Full payment is required online before an order is confirmed." />
      <section className="section">
        <div className="container-page">
          {notice && (
            <div role="status" className="mb-8 rounded-2xl border border-gold bg-gold/10 p-6">
              <h2 className="text-2xl">{notice === "mpesa" ? "M-Pesa" : "Card"} payment will be connected later</h2>
              <p className="mt-2 text-charcoal/80">
                This is the frontend demonstration. Your details were validated, but <strong>no payment was taken and no order was placed</strong>. In the next phase this step will start a real {notice === "mpesa" ? "M-Pesa (Daraja) request" : "card payment"}, and an order will only be confirmed once payment is complete.
              </p>
            </div>
          )}
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
              </fieldset>

              <fieldset className="space-y-5">
                <legend className="mb-2 text-2xl font-display">Delivery or collection</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["delivery", "collection"] as const).map((m) => (
                    <label key={m} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 ${method === m ? "border-gold bg-gold/10" : "border-charcoal/20 bg-white"}`}>
                      <input type="radio" value={m} className="accent-[#79543B]" {...register("method")} />
                      <span className="text-sm font-medium">{m === "delivery" ? "Delivery" : siteConfig.checkout.collectionLabel}</span>
                    </label>
                  ))}
                </div>
                {method === "delivery" && (
                  <>
                    <FormField label="Delivery area" htmlFor="k-area" error={errors.area?.message}>
                      <select id="k-area" className={`input-base ${errors.area ? "input-error" : ""}`} {...register("area")}>
                        <option value="">Select an area</option>
                        {siteConfig.checkout.deliveryAreas.map((a) => (
                          <option key={a.id} value={a.id}>{a.label} ({formatKSh(a.fee)})</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Delivery address" htmlFor="k-address" error={errors.address?.message}>
                      <textarea id="k-address" rows={3} autoComplete="street-address" className={`input-base ${errors.address ? "input-error" : ""}`} {...register("address")} />
                    </FormField>
                    <p className="text-xs text-charcoal/55">Delivery charges are sample values pending confirmation.</p>
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
                <DemoNotice>Online orders are paid in full before confirmation. Real M-Pesa and card payments will be connected in a later phase.</DemoNotice>
              </fieldset>
            </div>

            <aside className="h-fit rounded-2xl border border-charcoal/10 bg-white p-6 lg:sticky lg:top-28">
              <h2 className="text-2xl">Order summary</h2>
              <ul className="mt-5 divide-y divide-charcoal/10">
                {lines.map((l) => (
                  <li key={l.product.slug} className="flex items-center gap-3 py-3">
                    <img src={l.product.images[0]} alt="" className="h-14 w-14 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.product.name}</p>
                      <p className="text-xs text-charcoal/60">Qty {l.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatKSh(l.lineTotal)}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-charcoal/10 pt-4 text-sm">
                <div className="flex justify-between"><dt>Product subtotal</dt><dd>{formatKSh(subtotal)}</dd></div>
                <div className="flex justify-between"><dt>Delivery charge</dt><dd>{method === "collection" ? "Free (collection)" : area ? formatKSh(fee) : "Select area"}</dd></div>
              </dl>
              <div className="mt-4 flex justify-between border-t border-charcoal/10 pt-4 text-lg font-bold">
                <span>Total</span><span>{formatKSh(total)}</span>
              </div>
              <Button type="submit" size="lg" fullWidth className="mt-6">
                {payment === "mpesa" ? "Pay with M-Pesa" : "Pay by Card"}
              </Button>
              <ButtonLink to="/cart" variant="ghost" fullWidth className="mt-2">Back to cart</ButtonLink>
            </aside>
          </form>
        </div>
      </section>
    </>
  );
}
