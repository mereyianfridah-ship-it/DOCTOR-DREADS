import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { PageHeader } from "../components/common/PageHeader";
import { rememberGuestEmail } from "../utils/guestAccess";

const schema = z.object({
  kind: z.enum(["order", "booking"]),
  reference: z.string().trim().min(3, "Enter your reference (e.g. ORD-XXXXXX)").max(30),
  email: z.string().trim().email("Enter the email used when you placed it"),
});
type Values = z.infer<typeof schema>;

/** Guest lookup of an order or booking by reference + email. */
export default function Track() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { kind: "order", reference: "", email: "" } });
  const onSubmit = (v: Values) => {
    const ref = v.reference.toUpperCase();
    rememberGuestEmail(v.kind, ref, v.email);
    navigate(v.kind === "order" ? `/orders/${ref}` : `/bookings/${ref}`);
  };
  return (
    <>
      <PageHeader eyebrow="Track" title="Find an order or booking" description="Enter the reference we gave you and the email address you used." />
      <section className="section">
        <div className="container-page max-w-lg">
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
            <FormField label="What are you looking for?" htmlFor="t-kind">
              <select id="t-kind" className="input-base" {...register("kind")}>
                <option value="order">A shop order</option>
                <option value="booking">An appointment</option>
              </select>
            </FormField>
            <FormField label="Reference" htmlFor="t-ref" error={errors.reference?.message}>
              <input id="t-ref" className={`input-base ${errors.reference ? "input-error" : ""}`} autoCapitalize="characters" {...register("reference")} />
            </FormField>
            <FormField label="Email" htmlFor="t-email" error={errors.email?.message}>
              <input id="t-email" type="email" autoComplete="email" className={`input-base ${errors.email ? "input-error" : ""}`} {...register("email")} />
            </FormField>
            <Button type="submit" size="lg" fullWidth>Find it</Button>
          </form>
        </div>
      </section>
    </>
  );
}
