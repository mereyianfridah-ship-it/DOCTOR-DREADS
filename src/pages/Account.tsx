import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { AccountLayout } from "../components/layout/AccountLayout";
import { demoProfile } from "../data/account";
import { phoneSchema } from "../utils/validation";

const schema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: phoneSchema,
});
type Values = z.infer<typeof schema>;

export default function Account() {
  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: demoProfile.fullName, email: demoProfile.email, phone: demoProfile.phone },
  });

  // TODO(supabase): update the profile row for the signed-in user.
  const onSubmit = () => toast.info("Demo only: profile changes are not saved.");

  return (
    <AccountLayout title="My profile">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-5 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
        <h2 className="text-2xl">Profile details</h2>
        <FormField label="Full name" htmlFor="p-name" error={errors.fullName?.message}>
          <input id="p-name" className={`input-base ${errors.fullName ? "input-error" : ""}`} {...register("fullName")} />
        </FormField>
        <FormField label="Email" htmlFor="p-email" error={errors.email?.message}>
          <input id="p-email" type="email" className={`input-base ${errors.email ? "input-error" : ""}`} {...register("email")} />
        </FormField>
        <FormField label="Phone number" htmlFor="p-phone" error={errors.phone?.message}>
          <input id="p-phone" type="tel" className={`input-base ${errors.phone ? "input-error" : ""}`} {...register("phone")} />
        </FormField>
        <Button type="submit" disabled={!isDirty}>Save Changes</Button>
      </form>
    </AccountLayout>
  );
}
