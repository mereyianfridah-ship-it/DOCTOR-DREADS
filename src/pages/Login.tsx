import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { errorMessage } from "../api/client";
import { AuthCard } from "../components/common/AuthCard";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { useAuth } from "../context/AuthContext";
import { safeRedirect } from "../utils/redirect";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
type Values = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (v: Values) => {
    setFormError(null);
    try {
      const user = await login(v.email, v.password);
      toast.success(`Welcome back, ${user.fullName.split(" ")[0]}`);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from ? safeRedirect(from) : user.role === "admin" ? "/admin" : "/account", { replace: true });
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to view your bookings and orders.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormField label="Email" htmlFor="l-email" error={errors.email?.message}>
          <input id="l-email" type="email" autoComplete="email" className={`input-base ${errors.email ? "input-error" : ""}`} {...register("email")} />
        </FormField>
        <FormField label="Password" htmlFor="l-pass" error={errors.password?.message}>
          <input id="l-pass" type="password" autoComplete="current-password" className={`input-base ${errors.password ? "input-error" : ""}`} {...register("password")} />
        </FormField>
        {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>{isSubmitting ? "Signing in…" : "Sign In"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-charcoal/70">
        New here? <Link to="/register" className="font-semibold text-brown underline">Create an account</Link>
      </p>
      <p className="mt-2 text-center text-sm text-charcoal/70">
        Placed an order or booking as a guest? <Link to="/track" className="font-semibold text-brown underline">Look it up</Link>
      </p>
    </AuthCard>
  );
}
