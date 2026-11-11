/** Thin fetch wrapper for the Dr Dread API. Never stores or logs passwords. */

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const TOKEN_KEY = "drdread.token";
export const UNAUTHORIZED_EVENT = "drdread:unauthorized";

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** JSON body */
  body?: unknown;
  /** multipart body (consultation photos) */
  form?: FormData;
  signal?: AbortSignal;
}

function buildHeaders(opts: RequestOptions): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function toError(res: Response, hadToken: boolean): Promise<ApiError> {
  let message = `Request failed (${res.status})`;
  let fields: Record<string, string> | undefined;
  try {
    const j = (await res.json()) as { error?: string; fields?: Record<string, string> };
    if (j.error) message = j.error;
    fields = j.fields;
  } catch {
    /* non-JSON error body */
  }
  if (res.status === 401 && hadToken && typeof window !== "undefined") window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  return new ApiError(res.status, message, fields);
}

export async function api<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers = buildHeaders(opts);
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "Could not reach the server. Check your connection and try again.");
  }
  if (!res.ok) throw await toError(res, headers.has("Authorization"));
  return (await res.json()) as T;
}

/** Fetches a protected file (e.g. private consultation photo) with the bearer token; returns a Blob. */
export async function apiBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const headers = buildHeaders({});
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { headers, signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError(0, "Could not reach the server.");
  }
  if (!res.ok) throw await toError(res, headers.has("Authorization"));
  return res.blob();
}

/** User-facing message for any thrown value. */
export function errorMessage(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
