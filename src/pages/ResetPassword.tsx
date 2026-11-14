import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { errorMessage } from "../api/client";
import { resetPassword } from "../api/endpoints";
import { AuthCard } from "../components/common/AuthCard";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type Values = z.infer<typeof schema>;

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  if (!/^[a-f0-9]{64}$/.test(token)) {
    return (
      <AuthCard title="Link not valid" subtitle="This reset link is incomplete or has been damaged.">
        <Link to="/forgot-password" className="font-semibold text-brown underline">Request a new link</Link>
      </AuthCard>
    );
  }

  const onSubmit = async (v: Values) => {
    setFormError(null);
    try {
      await resetPassword(token, v.password);
      toast.success("Password updated. Please sign in with your new password.");
      navigate("/login", { replace: true });
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  return (
    <AuthCard title="Choose a new password" subtitle="Pick something at least 8 characters long.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormField label="New password" htmlFor="rp-pass" error={errors.password?.message}>
          <input id="rp-pass" type="password" autoComplete="new-password" className={`input-base ${errors.password ? "input-error" : ""}`} {...register("password")} />
        </FormField>
        <FormField label="Confirm new password" htmlFor="rp-confirm" error={errors.confirm?.message}>
          <input id="rp-confirm" type="password" autoComplete="new-password" className={`input-base ${errors.confirm ? "input-error" : ""}`} {...register("confirm")} />
        </FormField>
        {formError && (
          <p role="alert" className="text-sm text-red-700">{formError} <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link></p>
        )}
        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Update password"}</Button>
      </form>
    </AuthCard>
  );
}
