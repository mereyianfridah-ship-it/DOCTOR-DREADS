import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MailCheck } from "lucide-react";
import { errorMessage } from "../api/client";
import { forgotPassword } from "../api/endpoints";
import { AuthCard } from "../components/common/AuthCard";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";

const schema = z.object({ email: z.string().trim().email("Enter a valid email address") });
type Values = z.infer<typeof schema>;

/** Asks for an email and always shows the same confirmation, so it can't be used to discover who has an account. */
export default function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = async (v: Values) => {
    setFormError(null);
    try {
      await forgotPassword(v.email);
      setSentTo(v.email);
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  if (sentTo) {
    return (
      <AuthCard title="Check your email" subtitle="We've done what we can from here.">
        <div role="status" className="text-center">
          <MailCheck className="mx-auto h-12 w-12 text-olive" aria-hidden />
          <p className="mt-4 text-sm text-charcoal/80">If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It works once and expires in about an hour. Check your spam folder if you don&apos;t see it.</p>
          <Link to="/login" className="mt-6 inline-block text-sm font-semibold text-brown underline">Back to sign in</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your account email and we'll send you a link to choose a new password.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <FormField label="Email" htmlFor="f-email" error={errors.email?.message}>
          <input id="f-email" type="email" autoComplete="email" className={`input-base ${errors.email ? "input-error" : ""}`} {...register("email")} />
        </FormField>
        {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
        <Button type="submit" size="lg" fullWidth disabled={isSubmitting}>{isSubmitting ? "Sending…" : "Send reset link"}</Button>
      </form>
      <p className="mt-6 text-center text-sm text-charcoal/70">Remembered it? <Link to="/login" className="font-semibold text-brown underline">Sign in</Link></p>
    </AuthCard>
  );
}
