import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ApiError, errorMessage } from "../api/client";
import { changePassword } from "../api/endpoints";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { AccountLayout } from "../components/layout/AccountLayout";
import { useAuth } from "../context/AuthContext";
import { phoneSchema } from "../utils/validation";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  phone: phoneSchema,
});
type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "Passwords do not match" });
type PasswordValues = z.infer<typeof passwordSchema>;

function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, formState: { errors, isDirty, isSubmitting } } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? "", phone: user?.phone ?? "" },
  });

  const onSubmit = async (v: ProfileValues) => {
    setFormError(null);
    try {
      const u = await updateProfile(v);
      reset({ fullName: u.fullName, phone: u.phone });
      toast.success("Profile updated.");
    } catch (e) {
      setFormError(errorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-xl space-y-5 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
      <h2 className="text-2xl">Profile details</h2>
      <FormField label="Full name" htmlFor="p-name" error={errors.fullName?.message}>
        <input id="p-name" autoComplete="name" className={`input-base ${errors.fullName ? "input-error" : ""}`} {...register("fullName")} />
      </FormField>
      <FormField label="Email" htmlFor="p-email" hint="Your email is your sign-in and can't be changed here yet.">
        <input id="p-email" type="email" value={user?.email ?? ""} readOnly className="input-base bg-charcoal/5" />
      </FormField>
      <FormField label="Phone number" htmlFor="p-phone" error={errors.phone?.message}>
        <input id="p-phone" type="tel" autoComplete="tel" className={`input-base ${errors.phone ? "input-error" : ""}`} {...register("phone")} />
      </FormField>
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <Button type="submit" disabled={!isDirty || isSubmitting}>{isSubmitting ? "Saving…" : "Save Changes"}</Button>
    </form>
  );
}

function PasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirm: "" },
  });

  const onSubmit = async (v: PasswordValues) => {
    setFormError(null);
    try {
      await changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword });
      reset();
      toast.success("Password changed.");
    } catch (e) {
      if (e instanceof ApiError && e.fields?.currentPassword) setError("currentPassword", { message: e.fields.currentPassword });
      setFormError(errorMessage(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 max-w-xl space-y-5 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
      <h2 className="text-2xl">Change password</h2>
      <FormField label="Current password" htmlFor="pw-cur" error={errors.currentPassword?.message}>
        <input id="pw-cur" type="password" autoComplete="current-password" className={`input-base ${errors.currentPassword ? "input-error" : ""}`} {...register("currentPassword")} />
      </FormField>
      <FormField label="New password" htmlFor="pw-new" error={errors.newPassword?.message} hint="At least 8 characters">
        <input id="pw-new" type="password" autoComplete="new-password" className={`input-base ${errors.newPassword ? "input-error" : ""}`} {...register("newPassword")} />
      </FormField>
      <FormField label="Confirm new password" htmlFor="pw-confirm" error={errors.confirm?.message}>
        <input id="pw-confirm" type="password" autoComplete="new-password" className={`input-base ${errors.confirm ? "input-error" : ""}`} {...register("confirm")} />
      </FormField>
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <Button type="submit" variant="secondary" disabled={isSubmitting}>{isSubmitting ? "Updating…" : "Update Password"}</Button>
    </form>
  );
}

export default function Account() {
  return (
    <AccountLayout title="My profile">
      <ProfileForm />
      <PasswordForm />
    </AccountLayout>
  );
}
