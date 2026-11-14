import { useState, type FormEvent } from "react";
import { CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "../../api/client";
import { submitReview } from "../../api/endpoints";
import { Button } from "../common/Button";
import { FormField } from "../common/FormField";

const LABELS = ["Poor", "Fair", "Good", "Very good", "Excellent"];

/** "Share your experience": reviews wait for the salon's approval before they appear on the site. */
export function ReviewForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [detail, setDetail] = useState("");
  const [rating, setRating] = useState(0);
  const [quote, setQuote] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "Enter a valid email address";
    if (rating < 1) e.rating = "Choose a rating from 1 to 5";
    if (quote.trim().length < 20) e.quote = "Please write at least 20 characters";
    else if (quote.trim().length > 600) e.quote = "Please keep it under 600 characters";
    return e;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setFieldErrors(e);
    setFormError(null);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      // `website` is a honeypot field: real visitors never see or fill it.
      await submitReview({ name: name.trim(), email: email.trim(), detail: detail.trim(), rating, quote: quote.trim(), website: honeypot });
      setSent(true);
      toast.success("Thank you for your review.");
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-olive/30 bg-olive/10 p-8 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-olive" aria-hidden />
        <h3 className="mt-4 text-2xl">Thank you!</h3>
        <p className="mt-2 text-charcoal/75">Your review will appear on the site once the salon has approved it.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto mt-10 max-w-xl space-y-5 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
      <div className="sr-only" aria-hidden>
        <label htmlFor="rv-website">Leave this field empty</label>
        <input id="rv-website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-charcoal">Your rating</legend>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n === 1 ? "" : "s"}: ${LABELS[n - 1]}`}
              onClick={() => setRating(n)}
              className="rounded p-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Star className={`h-8 w-8 transition ${n <= rating ? "fill-gold text-gold" : "text-charcoal/25 hover:text-gold"}`} aria-hidden />
            </button>
          ))}
          {rating > 0 && <span className="ml-2 text-sm text-charcoal/65">{LABELS[rating - 1]}</span>}
        </div>
        {fieldErrors.rating && <p role="alert" className="mt-1 text-sm text-red-700">{fieldErrors.rating}</p>}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Your name" htmlFor="rv-name" error={fieldErrors.name} hint="Shown with your review">
          <input id="rv-name" autoComplete="name" maxLength={80} className={`input-base ${fieldErrors.name ? "input-error" : ""}`} value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Email" htmlFor="rv-email" error={fieldErrors.email} hint="Never shown publicly">
          <input id="rv-email" type="email" autoComplete="email" className={`input-base ${fieldErrors.email ? "input-error" : ""}`} value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
      </div>
      <FormField label="Service you had" htmlFor="rv-detail" optional>
        <input id="rv-detail" maxLength={80} placeholder="e.g. Loc retouching" className="input-base" value={detail} onChange={(e) => setDetail(e.target.value)} />
      </FormField>
      <FormField label="Your review" htmlFor="rv-quote" error={fieldErrors.quote} hint={`${quote.trim().length}/600`}>
        <textarea id="rv-quote" rows={4} maxLength={600} className={`input-base ${fieldErrors.quote ? "input-error" : ""}`} value={quote} onChange={(e) => setQuote(e.target.value)} />
      </FormField>
      {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
      <Button type="submit" size="lg" disabled={busy}>{busy ? "Sending…" : "Submit review"}</Button>
    </form>
  );
}
