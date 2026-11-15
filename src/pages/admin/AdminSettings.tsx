import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { ApiError, errorMessage } from "../../api/client";
import { adminBusiness, adminSaveBusiness } from "../../api/endpoints";
import { AdminPage } from "../../components/admin/AdminUi";
import { Button } from "../../components/common/Button";
import { QueryState } from "../../components/common/QueryState";
import { useAsync } from "../../hooks/useAsync";
import { invalidateBusiness } from "../../hooks/useBusiness";
import type { BusinessSettings } from "../../types";

type Key = keyof BusinessSettings;
const SECTIONS: { title: string; fields: { key: Key; label: string; placeholder: string; hint?: string; type?: string }[] }[] = [
  {
    title: "Where and when",
    fields: [
      { key: "location", label: "Location", placeholder: "Rongai, Kenya", hint: "Shown in the footer, Contact page and booking form." },
      { key: "hours", label: "Opening hours", placeholder: "Mon–Sat 9am–6pm", hint: "Free text, shown on the Contact page." },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "phone", label: "Phone", placeholder: "0712 345 678", type: "tel", hint: "Kenyan numbers are formatted for you. Customers tap it to call." },
      { key: "whatsapp", label: "WhatsApp", placeholder: "0712 345 678", type: "tel", hint: "Opens a WhatsApp chat when tapped." },
      { key: "email", label: "Email", placeholder: "hello@yourdomain.co.ke", type: "email" },
    ],
  },
  {
    title: "Social media",
    fields: [
      { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/yourpage", hint: "Paste the full link. Leave empty to hide the icon." },
      { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourpage" },
      { key: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@yourpage" },
    ],
  },
];

export default function AdminSettings() {
  const { data, loading, error, reload } = useAsync((s) => adminBusiness(s), []);
  const [form, setForm] = useState<BusinessSettings | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const dirty = !!form && !!data && (Object.keys(form) as Key[]).some((k) => form[k] !== data[k]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setErrors({});
    try {
      const saved = await adminSaveBusiness(form);
      setForm(saved);
      invalidateBusiness();
      toast.success("Business details saved");
      reload();
    } catch (err) {
      if (err instanceof ApiError && err.fields) setErrors(err.fields);
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminPage title="Settings" description="Your contact details, opening hours and social links. Anything you leave empty is hidden from the website instead of showing a placeholder.">
      <QueryState loading={loading && !form} error={error} onRetry={reload}>
        {form && (
          <form onSubmit={(e) => void save(e)} className="max-w-2xl space-y-8" noValidate>
            {SECTIONS.map((sec) => (
              <fieldset key={sec.title} className="rounded-2xl border border-charcoal/10 bg-white p-6">
                <legend className="px-2 font-display text-xl">{sec.title}</legend>
                <div className="space-y-5">
                  {sec.fields.map((f) => (
                    <div key={f.key}>
                      <label htmlFor={`b-${f.key}`} className="mb-1 block text-sm font-semibold">{f.label}</label>
                      <input
                        id={`b-${f.key}`}
                        type={f.type ?? "text"}
                        value={form[f.key]}
                        placeholder={f.placeholder}
                        maxLength={f.key === "hours" ? 200 : 254}
                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                        aria-invalid={!!errors[f.key]}
                        aria-describedby={errors[f.key] ? `b-${f.key}-err` : f.hint ? `b-${f.key}-hint` : undefined}
                        className={`input-base ${errors[f.key] ? "input-error" : ""}`}
                      />
                      {errors[f.key] ? (
                        <p id={`b-${f.key}-err`} role="alert" className="mt-1 text-sm text-red-700">{errors[f.key]}</p>
                      ) : f.hint ? (
                        <p id={`b-${f.key}-hint`} className="mt-1 text-xs text-charcoal/60">{f.hint}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving || !dirty}>{saving ? "Saving…" : "Save changes"}</Button>
              {!dirty && !saving && <span className="text-sm text-charcoal/60">No unsaved changes</span>}
            </div>
          </form>
        )}
      </QueryState>
    </AdminPage>
  );
}
