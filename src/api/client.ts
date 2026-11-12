
/** Thin fetch wrapper for the Dr Dread API.
 * Handles authentication, JSON, multipart uploads and protected files.
 * Never stores or logs passwords.
 */
import type { AuthUser } from "../types";

const RAW_BASE = (import.meta.env.VITE_API_URL ?? "").trim();

// Expected VITE_API_URL: https://your-backend.onrender.com
// The /api prefix is added automatically.
const BASE = RAW_BASE.replace(/\/+$/, "");

const TOKEN_KEY = "drdread.token";
export const UNAUTHORIZED_EVENT = "drdread:unauthorized";

// ---- errors -----------------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

// ---- authentication token ---------------------------------------------------------------------

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Storage may be unavailable.
  }
}

// ---- request options --------------------------------------------------------------------------

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";

  /** JSON request body */
  body?: unknown;

  /** Multipart form data, e.g. consultation photos */
  form?: FormData;

  /** Request cancellation */
  signal?: AbortSignal;
}

// ---- URL handling -----------------------------------------------------------------------------

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith("/")
    ? path
    : `/${path}`;

  return `${BASE}/api${normalizedPath}`;
}

// ---- headers ----------------------------------------------------------------------------------

function buildHeaders(opts: RequestOptions): Headers {
  const headers = new Headers({
    Accept: "application/json",
  });

  // Never manually set multipart Content-Type.
  // The browser must generate its own boundary.
  if (opts.body !== undefined && !opts.form) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

// ---- unauthorized response handling -----------------------------------------------------------

function dispatchUnauthorized(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
}

// ---- error handling ---------------------------------------------------------------------------

async function toError(
  res: Response,
  hadToken: boolean
): Promise<ApiError> {
  let message = `Request failed (${res.status})`;

  let fields: Record<string, string> | undefined;

  try {
    const text = await res.text();

    if (text) {
      try {
        const data = JSON.parse(text) as {
          error?: string;
          message?: string;
          fields?: Record<string, string>;
        };

        if (data.error || data.message) {
          message = data.error || data.message || message;
        }

        fields = data.fields;
      } catch {
        // Do not expose raw HTML or server error pages.
      }
    }
  } catch {
    // Response body could not be read.
  }

  if (res.status === 401 && hadToken) {
    dispatchUnauthorized();
  }

  return new ApiError(res.status, message, fields);
}

// ---- response handling ------------------------------------------------------------------------

async function parseResponse<T>(res: Response): Promise<T> {
  // Handle empty successful responses.
  if (res.status === 204 || res.status === 205) {
    return undefined as T;
  }

  const text = await res.text();

  if (!text.trim()) {
    return undefined as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(
      res.status,
      "The server returned an invalid response. Please try again."
    );
  }
}

// ---- network errors ---------------------------------------------------------------------------

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.name === "AbortError"
  );
}

function networkError(error: unknown): never {
  if (isAbortError(error)) {
    throw error;
  }

  throw new ApiError(
    0,
    "Could not reach the server. Check your internet connection and try again."
  );
}

// ---- main API request -------------------------------------------------------------------------

export async function api<T>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {

  if (opts.body !== undefined && opts.form !== undefined) {
    throw new ApiError(
      0,
      "A request cannot contain both JSON and multipart form data."
    );
  }

  const headers = buildHeaders(opts);

  let res: Response;

  try {
    res = await fetch(buildUrl(path), {
      method: opts.method ?? "GET",
      headers,

      body: opts.form
        ? opts.form
        : opts.body !== undefined
          ? JSON.stringify(opts.body)
          : undefined,

      signal: opts.signal,
    });
  } catch (error) {
    networkError(error);
  }

  if (!res.ok) {
    throw await toError(
      res,
      headers.has("Authorization")
    );
  }

  return parseResponse<T>(res);
}

// ---- protected file requests ------------------------------------------------------------------

/**
 * Fetches protected files such as private consultation photos.
 * Automatically includes the bearer token.
 * Returns a Blob.
 */

export async function apiBlob(
  path: string,
  signal?: AbortSignal
): Promise<Blob> {

  const headers = buildHeaders({});

  let res: Response;

  try {
    res = await fetch(buildUrl(path), {
      method: "GET",
      headers,
      signal,
    });
  } catch (error) {
    networkError(error);
  }

  if (!res.ok) {
    throw await toError(
      res,
      headers.has("Authorization")
    );
  }

  return res.blob();
}
// ---- user cookie-based authentication -----------------------------------------------------------

export const loginUserCookie = (body: { email: string; password: string }) =>
  api<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body,
  });

export const registerUserCookie = (body: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  terms: true;
}) =>
  api<{ token: string; user: AuthUser }>("/auth/register", {
    method: "POST",
    body,
  });

export const getMeCookie = (signal?: AbortSignal) =>
  api<{ user: AuthUser }>("/auth/me", { signal });

export const logoutUserCookie = () => {
  setToken(null);
  // The backend clears the HttpOnly cookie on logout.
  // We just need to clear local state.
  // Note: We don't call api here because the backend expects
  // the cookie to be cleared on the server side.
};

// ---- user-friendly error messages -------------------------------------------------------------

export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again."
): string {

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
