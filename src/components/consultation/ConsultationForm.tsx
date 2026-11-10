import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import type { FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "../common/Button";
import { DemoNotice } from "../common/DemoNotice";
import { FormField } from "../common/FormField";
import { BookingStepper } from "../booking/BookingStepper";
import { siteConfig } from "../../config/site";
import { formatBytes, formatKSh } from "../../utils/format";
import { phoneSchema } from "../../utils/validation";

const STEPS = ["Contact", "Your hair", "Photos", "Review"] as const;
const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

const hairConditions = ["Natural, no chemicals", "Relaxed / chemically treated", "Colour-treated", "Dry or damaged", "Existing locs", "Not sure"];
const hairLengths = ["Very short (under 2 cm)", "Short (2–5 cm)", "Medium (5–10 cm)", "Long (10 cm+)", "Not sure"];
const locSizes = ["Micro", "Small", "Medium", "Large", "Not sure: advise me"];
const installTypes = ["Comb coils", "Two-strand twists", "Interlocking", "Freeform", "Not sure: advise me"];

const schema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name"),
  phone: phoneSchema,
  email: z.string().trim().email("Enter a valid email address").or(z.literal("")),
  condition: z.string().min(1, "Select your hair condition"),
  length: z.string().min(1, "Select your hair length"),
  locSize: z.string().min(1, "Select a loc size"),
  installType: z.string().min(1, "Select an installation type"),
  info: z.string().trim().max(1000, "Please keep this under 1000 characters"),
  marketingConsent: z.boolean(),
});
type Values = z.infer<typeof schema>;

const stepFields: FieldPath<Values>[][] = [
  ["fullName", "phone", "email"],
  ["condition", "length", "locSize", "installType", "info"],
  [],
  [],
];

interface Photo {
  id: string;
  file: File;
  url: string;
}

function SelectField({ id, label, options, error, reg }: { id: string; label: string; options: string[]; error?: string; reg: object }) {
  return (
    <FormField label={label} htmlFor={id} error={error}>
      <select id={id} className={`input-base ${error ? "input-error" : ""}`} defaultValue="" {...reg}>
        <option value="" disabled>Select…</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </FormField>
  );
}

export function ConsultationForm() {
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;

  const { register, trigger, handleSubmit, getValues, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "", email: "", condition: "", length: "", locSize: "", installType: "", info: "", marketingConsent: false },
  });

  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const incoming: File[] = Array.from(e.target.files ?? []);
    e.target.value = "";
    const errs: string[] = [];
    const accepted: Photo[] = [];
    for (const file of incoming) {
      if (!ACCEPTED.includes(file.type)) errs.push(`${file.name}: only JPG, PNG or WebP images are allowed`);
      else if (file.size > MAX_BYTES) errs.push(`${file.name}: larger than ${formatBytes(MAX_BYTES)}`);
      else if (photos.length + accepted.length >= MAX_FILES) errs.push(`Maximum of ${MAX_FILES} photos`);
      else accepted.push({ id: `${file.name}-${file.size}-${Date.now()}-${accepted.length}`, file, url: URL.createObjectURL(file) });
    }
    setPhotoError([...new Set(errs)].join(". "));
    if (accepted.length) setPhotos((prev) => [...prev, ...accepted]);
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
    setPhotoError("");
  };

  const next = async () => {
    const ok = await trigger(stepFields[step]);
    if (ok) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const onSubmit = () => {
    // TODO(backend): upload photos (Cloudinary) and POST the consultation request. Nothing is sent now.
    setSubmitted(true);
    toast.success("Demo consultation recorded locally. Nothing was sent.");
  };

  if (submitted) {
    const v = getValues();
    return (
      <div role="status" className="rounded-2xl border border-olive/30 bg-olive/10 p-8 text-center sm:p-12">
        <CheckCircle2 className="mx-auto h-14 w-14 text-olive" aria-hidden />
        <h2 className="mt-4 text-3xl">Consultation form completed (demo)</h2>
        <p className="mx-auto mt-3 max-w-xl text-charcoal/80">
          Thank you, {v.fullName.split(" ")[0]}. This is a frontend demonstration, so your details and {photos.length} photo{photos.length === 1 ? "" : "s"} have <strong>not</strong> been sent anywhere. Once the backend is connected, Dr Dread Kenya will review submissions and reply with a recommendation and quote.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to="/services">Browse services</ButtonLink>
          <ButtonLink to="/" variant="outline">Back to home</ButtonLink>
        </div>
      </div>
    );
  }

  const v = getValues();
  const fee = siteConfig.booking.inPersonConsultationFee;

  return (
    <div>
      <BookingStepper steps={STEPS} current={step} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        {step === 0 && (
          <>
            <h2 className="text-3xl">Your contact details</h2>
            <FormField label="Full name" htmlFor="f-name" error={errors.fullName?.message}>
              <input id="f-name" autoComplete="name" className={`input-base ${errors.fullName ? "input-error" : ""}`} {...register("fullName")} />
            </FormField>
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Phone number" htmlFor="f-phone" error={errors.phone?.message}>
                <input id="f-phone" type="tel" autoComplete="tel" placeholder="e.g. 0712 345 678" className={`input-base ${errors.phone ? "input-error" : ""}`} {...register("phone")} />
              </FormField>
              <FormField label="Email" htmlFor="f-email" optional error={errors.email?.message}>
                <input id="f-email" type="email" autoComplete="email" className={`input-base ${errors.email ? "input-error" : ""}`} {...register("email")} />
              </FormField>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-3xl">Tell us about your hair</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <SelectField id="f-cond" label="Current hair condition" options={hairConditions} error={errors.condition?.message} reg={register("condition")} />
              <SelectField id="f-len" label="Hair length" options={hairLengths} error={errors.length?.message} reg={register("length")} />
              <SelectField id="f-size" label="Desired loc size" options={locSizes} error={errors.locSize?.message} reg={register("locSize")} />
              <SelectField id="f-type" label="Desired installation type" options={installTypes} error={errors.installType?.message} reg={register("installType")} />
            </div>
            <FormField label="Additional information" htmlFor="f-info" optional error={errors.info?.message}>
              <textarea id="f-info" rows={4} className="input-base" {...register("info")} />
            </FormField>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-3xl">Inspiration &amp; hair photos</h2>
            <p className="text-charcoal/70">Upload up to {MAX_FILES} photos (JPG, PNG or WebP, max {formatBytes(MAX_BYTES)} each). Photos are optional but help us advise you.</p>
            <label htmlFor="f-photos" className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-charcoal/25 bg-white p-10 text-center hover:border-gold ${photos.length >= MAX_FILES ? "pointer-events-none opacity-50" : ""}`}>
              <ImagePlus className="h-8 w-8 text-brown" aria-hidden />
              <span className="mt-2 font-semibold">Choose photos</span>
              <span className="text-sm text-charcoal/60">{photos.length} of {MAX_FILES} added</span>
              <input id="f-photos" type="file" accept={ACCEPTED.join(",")} multiple className="sr-only" onChange={onFiles} disabled={photos.length >= MAX_FILES} />
            </label>
            {photoError && <p role="alert" className="text-sm text-red-700">{photoError}</p>}
            {photos.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {photos.map((p) => (
                  <li key={p.id} className="relative overflow-hidden rounded-xl border border-charcoal/10 bg-white">
                    <img src={p.url} alt={`Preview of ${p.file.name}`} className="aspect-square w-full object-cover" />
                    <p className="truncate px-2 pt-1 text-xs">{p.file.name}</p>
                    <p className="px-2 pb-2 text-xs text-charcoal/55">{formatBytes(p.file.size)}</p>
                    <button type="button" onClick={() => removePhoto(p.id)} aria-label={`Remove ${p.file.name}`} className="absolute right-2 top-2 rounded-full bg-charcoal/80 p-1.5 text-offwhite hover:bg-charcoal">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-3xl">Review &amp; submit</h2>
            <dl className="divide-y divide-charcoal/10 rounded-2xl border border-charcoal/10 bg-white px-6">
              {[
                ["Name", v.fullName], ["Phone", v.phone], ["Email", v.email || "Not provided"],
                ["Hair condition", v.condition], ["Hair length", v.length], ["Loc size", v.locSize],
                ["Installation type", v.installType], ["Photos", `${photos.length} attached`], ["Notes", v.info || "None"],
              ].map(([k, val]) => (
                <div key={k} className="flex justify-between gap-6 py-3 text-sm"><dt className="text-charcoal/60">{k}</dt><dd className="text-right font-medium">{val}</dd></div>
              ))}
            </dl>
            <DemoNotice>
              {siteConfig.booking.onlineConsultationFree ? "Online photo consultations are free, subject to the business's stated policy. " : ""}
              In-person consultation fee: {fee === null ? "to be confirmed by the business" : formatKSh(fee)}.
            </DemoNotice>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-charcoal/15 bg-white p-4 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#79543B]" {...register("marketingConsent")} />
              <span><strong>Optional:</strong> I agree to receive occasional offers and news from Dr Dread Kenya. This is separate from my consultation request and I can opt out any time.</span>
            </label>
          </>
        )}

        <div className="flex items-center justify-between gap-3 pt-4">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next}>Continue</Button>
          ) : (
            <Button type="submit" size="lg">Submit Consultation</Button>
          )}
        </div>
      </form>
    </div>
  );
}
