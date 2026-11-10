import { config } from "../config.js";
import { HttpError } from "./errors.js";

const m = config.payments.mpesa;
const base = () => (m.env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke");

let cached: { token: string; exp: number } | null = null;
async function token(): Promise<string> {
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const r = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: "Basic " + Buffer.from(`${m.consumerKey}:${m.consumerSecret}`).toString("base64") },
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new HttpError(502, "Could not reach M-Pesa. Please try again.");
  const j = (await r.json()) as { access_token: string; expires_in: string };
  cached = { token: j.access_token, exp: Date.now() + Number(j.expires_in) * 1000 };
  return cached.token;
}

const timestamp = () => new Date().toISOString().replace(/\D/g, "").slice(0, 14);

/** Sends an STK push (customer gets a PIN prompt on their phone). Returns Safaricom's request ids. */
export async function stkPush(opts: { msisdn: string; amount: number; accountRef: string; description: string }) {
  const ts = timestamp();
  const r = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      BusinessShortCode: m.shortcode,
      Password: Buffer.from(m.shortcode + m.passkey + ts).toString("base64"),
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: opts.amount,
      PartyA: opts.msisdn,
      PartyB: m.shortcode,
      PhoneNumber: opts.msisdn,
      CallBackURL: `${m.callbackBaseUrl.replace(/\/$/, "")}/api/payments/mpesa/callback/${m.callbackSecret}`,
      AccountReference: opts.accountRef.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  });
  const j = (await r.json().catch(() => ({}))) as any;
  if (!r.ok || j.ResponseCode !== "0") throw new HttpError(502, j.errorMessage ?? j.ResponseDescription ?? "M-Pesa rejected the request");
  return { checkoutRequestId: j.CheckoutRequestID as string, merchantRequestId: j.MerchantRequestID as string };
}
