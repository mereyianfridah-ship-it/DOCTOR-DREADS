import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AuthCard } from "../components/common/AuthCard";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  // TODO(supabase): supabase.auth.signInWithPassword({ email, password }). The password is never stored here.
  const onSubmit = () => {
    toast.info("Demo mode: showing a sample account. No real sign-in occurred.");
    navigate("/account");
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
        <Button type="submit" size="lg" fullWidth>Sign In</Button>
      </form>
      <p className="mt-6 text-center text-sm text-charcoal/70">
        New here? <Link to="/register" className="font-semibold text-brown underline">Create an account</Link>
      </p>
    </AuthCard>
  );
}
