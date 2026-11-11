import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { errorMessage } from "../../api/client";
import { sendContact } from "../../api/endpoints";
import { Button } from "../common/Button";
import { FormField } from "../common/FormField";
import { phoneSchema } from "../../utils/validation";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: phoneSchema.or(z.literal("")),
  subject: z.string().trim().min(3, "Please add a subject"),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
});
type Values = z.infer<typeof schema>;

export function ContactForm() {
  const [honeypot, setHoneypot] = useState("");
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", phone: "", subject: "", message: "" } });

  const onSubmit = async (values: Values) => {
    setSendError(null);
    try {
      // `website` is a honeypot field: real visitors never see or fill it.
      await sendContact({ ...values, website: honeypot });
      setSent(true);
      reset();
      toast.success("Message sent.");
    } catch (e) {
      setSendError(errorMessage(e));
    }
  };

  if (sent) {
    return (
      <div className="rounded-2xl border border-olive/30 bg-olive/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-olive" aria-hidden />
        <h3 className="mt-4 text-2xl">Message sent</h3>
        <p className="mt-2 text-charcoal/75">Thanks for getting in touch. We&apos;ll reply as soon as we can.</p>
        <Button className="mt-6" variant="outline" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <div className="sr-only" aria-hidden>
        <label htmlFor="c-website">Leave this field empty</label>
        <input id="c-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Full name" htmlFor="c-name" error={errors.name?.message}>
          <input id="c-name" autoComplete="name" className={`input-base ${errors.name ? "input-error" : ""}`} {...register("name")} />
        </FormField>
        <FormField label="Email" htmlFor="c-email" error={errors.email?.message}>
          <input id="c-email" type="email" autoComplete="email" className={`input-base ${errors.email ? "input-error" : ""}`} {...register("email")} />
        </FormField>
      </div>
      <FormField label="Phone" htmlFor="c-phone" optional error={errors.phone?.message}>
        <input id="c-phone" type="tel" autoComplete="tel" placeholder="e.g. 0712 345 678" className={`input-base ${errors.phone ? "input-error" : ""}`} {...register("phone")} />
      </FormField>
      <FormField label="Subject" htmlFor="c-subject" error={errors.subject?.message}>
        <input id="c-subject" className={`input-base ${errors.subject ? "input-error" : ""}`} {...register("subject")} />
      </FormField>
      <FormField label="Message" htmlFor="c-message" error={errors.message?.message}>
        <textarea id="c-message" rows={5} className={`input-base ${errors.message ? "input-error" : ""}`} {...register("message")} />
      </FormField>
      {sendError && <p role="alert" className="text-sm text-red-700">{sendError}</p>}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
