import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { errorMessage } from "../api/client";
import { getConsultation, respondToQuotation } from "../api/endpoints";
import { ConfirmAction } from "../components/common/ConfirmAction";
import { Button } from "../components/common/Button";
import { FormField } from "../components/common/FormField";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { PageHeader } from "../components/common/PageHeader";
import { StatusBadge } from "../components/common/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { formatDateTime, formatKSh } from "../utils/format";
import { recallGuestEmail, rememberGuestEmail } from "../utils/guestAccess";
import { consultationCustomerMessage, consultationStatusInfo, consultationStepIndex, consultationSteps } from "../utils/status";
import { looksLikeEmailOrPhone } from "../utils/validation";

/**
 * Consultation status for the signed-in owner, or for a guest who supplies the email or phone number
 * given on the request. The contact is kept in this tab only (sessionStorage), like bookings and orders.
 */
export default function ConsultationStatus() {
  const { reference = "" } = useParams();
  const ref = reference.toUpperCase();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const fromQuery = params.get("contact") ?? undefined;
  if (fromQuery) rememberGuestEmail("consultation", ref, fromQuery);
  const [contact, setContact] = useState<string | undefined>(fromQuery ?? recallGuestEmail("consultation", ref));
  const { data, loading, error, reload } = useAsync((s) => getConsultation(ref, contact, s), [ref, contact, user?.id]);

  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | undefined>();
  const verify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!looksLikeEmailOrPhone(draft)) return setDraftError("Enter the email address or phone number you gave us");
    setDraftError(undefined);
    rememberGuestEmail("consultation", ref, draft.trim());
    setContact(draft.trim());
  };

  const [responding, setResponding] = useState(false);
  const respond = async (response: "accepted" | "declined") => {
    setResponding(true);
    try {
      await respondToQuotation(ref, response, contact);
      toast.success(response === "accepted" ? "Thanks! We've noted that you accept." : "We've noted that you declined.");
      reload();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setResponding(false);
    }
  };

  const c = data?.consultation;
  const info = c ? consultationStatusInfo[c.status] : null;
  const step = c ? consultationStepIndex(c.status) : 0;

  return (
    <>
      <PageHeader eyebrow="Consultation" title={`Request ${ref}`} />
      <section className="section">
        <div className="container-page max-w-3xl">
          <Link to="/track" className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-brown hover:underline"><ArrowLeft className="h-4 w-4" /> Track something else</Link>

          {loading && <LoadingSpinner />}

          {!loading && error && (
            <form onSubmit={verify} noValidate className="space-y-5 rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
              <p role="alert" className="text-sm text-charcoal/80">
                {contact ? "We couldn't match that reference with those details. " : "To protect your privacy, confirm who you are. "}
                Enter the email address or phone number you gave on your request.
              </p>
              <FormField label="Email or phone number" htmlFor="cs-contact" error={draftError}>
                <input id="cs-contact" className={`input-base ${draftError ? "input-error" : ""}`} value={draft} onChange={(e) => setDraft(e.target.value)} autoComplete="email" />
              </FormField>
              <div className="flex flex-wrap gap-3">
                <Button type="submit">View my request</Button>
                <Button type="button" variant="outline" onClick={reload}>Retry</Button>
              </div>
              <p className="text-xs text-charcoal/55">Signed in? <Link to="/login" className="font-semibold text-brown underline">Sign in</Link> and we'll recognise your requests automatically.</p>
            </form>
          )}

          {!loading && !error && c && info && (
            <div className="rounded-2xl border border-charcoal/10 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-charcoal/55">{c.reference} · received {formatDateTime(c.createdAt)}</p>
                  <h2 className="text-3xl">Your consultation request</h2>
                </div>
                <StatusBadge {...info} />
              </div>

              <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="Progress">
                {consultationSteps.map((st, i) => {
                  const done = i <= step;
                  return (
                    <li key={st.status} aria-current={i === step ? "step" : undefined} className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${done ? "border-olive/30 bg-olive/10 text-olive" : "border-charcoal/10 text-charcoal/50"}`}>
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${done ? "bg-olive text-offwhite" : "bg-charcoal/10"}`}>{done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}</span>
                      {st.label}
                    </li>
                  );
                })}
              </ol>
              <p className="mt-4 text-sm text-charcoal/80">{consultationCustomerMessage[c.status]}</p>

              {c.quotation && (
                <div className="mt-6 rounded-xl border border-gold/40 bg-gold/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-widest text-brown">Quotation</p>
                  <p className="mt-1 text-3xl font-semibold">{formatKSh(c.quotation.amount)}</p>
                  {c.quotation.note && <p className="mt-2 whitespace-pre-line text-sm text-charcoal/80">{c.quotation.note}</p>}
                  {c.quotation.quotedAt && <p className="mt-2 text-xs text-charcoal/55">Issued {formatDateTime(c.quotation.quotedAt)}</p>}
                  {c.quotation.response ? (
                    <p role="status" className="mt-4 rounded-lg bg-white/70 px-3 py-2 text-sm font-medium">
                      {c.quotation.response === "accepted" ? "You accepted this quotation" : "You declined this quotation"}
                      {c.quotation.respondedAt ? ` on ${formatDateTime(c.quotation.respondedAt)}` : ""}.
                      {c.quotation.response === "accepted" ? " The salon will contact you to arrange the next step." : ""}
                    </p>
                  ) : c.status === "quoted" ? (
                    <div className="mt-4 flex flex-wrap gap-3">
                      <ConfirmAction label="Accept quotation" confirmLabel="Yes, accept" variant="secondary" size="md" busy={responding} onConfirm={() => respond("accepted")}
                        message={`Accept this quotation of ${formatKSh(c.quotation.amount)}? This tells the salon you'd like to go ahead. Nothing is booked or charged yet.`} />
                      <ConfirmAction label="Decline" confirmLabel="Yes, decline" size="md" busy={responding} onConfirm={() => respond("declined")}
                        message="Decline this quotation? You can still contact the salon or start a new consultation later." />
                    </div>
                  ) : null}
                  <p className="mt-3 text-xs text-charcoal/60">This is an estimate from the salon. Online payment is not available yet; the salon will confirm next steps with you.</p>
                </div>
              )}

              <dl className="mt-6 divide-y divide-charcoal/10 text-sm">
                {[["Hair condition", c.condition], ["Hair length", c.length], ["Loc size", c.locSize], ["Installation type", c.installType], ["Photos sent", String(c.photos)], ["Your notes", c.info || "None"]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-6 py-3"><dt className="text-charcoal/60">{k}</dt><dd className="text-right font-medium">{v}</dd></div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
