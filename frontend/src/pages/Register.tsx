import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthCard } from "../components/common/AuthCard";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { phoneSchema } from "../utils/validation";

const schema = z
  .object({
    fullName: z.string().trim().min(2, "Please enter your full name"),
    email: z.string().trim().email("Enter a valid email address"),
    phone: phoneSchema,
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, "You must accept the terms to continue"),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type Values = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirm: "", terms: false },
  });

  // TODO(supabase): supabase.auth.signUp(...). Passwords are never stored in localStorage.
  const onSubmit = () => {
    toast.info("Demo mode: no account was created.");
    navigate("/account");
  };

  return (
    <AuthCard title="Create account" subtitle="Save your details and track bookings and orders.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormField label="Full name" htmlFor="r-name" error={errors.fullName?.message}>
          <input id="r-name" autoComplete="name" className={`input-base ${errors.fullName ? "input-error" : ""}`} {...register("fullName")} />
        </FormField>
        <FormField label="Email" htmlFor="r-email" error={errors.email?.message}>
          <input id="r-email" type="email" autoComplete="email" className={`input-base ${errors.email ? "input-error" : ""}`} {...register("email")} />
        </FormField>
        <FormField label="Phone number" htmlFor="r-phone" error={errors.phone?.message}>
          <input id="r-phone" type="tel" autoComplete="tel" className={`input-base ${errors.phone ? "input-error" : ""}`} {...register("phone")} />
        </FormField>
        <FormField label="Password" htmlFor="r-pass" error={errors.password?.message}>
          <input id="r-pass" type="password" autoComplete="new-password" className={`input-base ${errors.password ? "input-error" : ""}`} {...register("password")} />
        </FormField>
        <FormField label="Confirm password" htmlFor="r-confirm" error={errors.confirm?.message}>
          <input id="r-confirm" type="password" autoComplete="new-password" className={`input-base ${errors.confirm ? "input-error" : ""}`} {...register("confirm")} />
        </FormField>
        <div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#79543B]" {...register("terms")} />
            <span>I accept the <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.</span>
          </label>
          {errors.terms && <p role="alert" className="mt-1 text-sm text-red-700">{errors.terms.message}</p>}
        </div>
        <Button type="submit" size="lg" fullWidth>Create Account</Button>
      </form>
      <p className="mt-6 text-center text-sm text-charcoal/70">
        Already registered? <Link to="/login" className="font-semibold text-brown underline">Sign in</Link>
      </p>
    </AuthCard>
  );
}
