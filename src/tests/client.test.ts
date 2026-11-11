import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiError, UNAUTHORIZED_EVENT, api, errorMessage, getToken, setToken } from "../api/client";
import { recallGuestEmail, rememberGuestEmail } from "../utils/guestAccess";

type Call = { url: string; init: RequestInit };
const store = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
const g = globalThis as unknown as Record<string, unknown>;
let calls: Call[];
let events: string[];

function mockFetch(status: number, body: unknown) {
  g.fetch = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => body, blob: async () => new Blob() } as Response;
  };
}

beforeEach(() => {
  calls = [];
  events = [];
  g.window = { localStorage: store(), sessionStorage: store(), dispatchEvent: (e: Event) => void events.push(e.type) };
  g.Event = class { type: string; constructor(t: string) { this.type = t; } };
});
afterEach(() => {
  delete g.window;
  delete g.fetch;
});

describe("api client", () => {
  it("returns parsed JSON and calls /api paths", async () => {
    mockFetch(200, { ok: true });
    expect(await api<{ ok: boolean }>("/health")).toEqual({ ok: true });
    expect(calls[0].url).toBe("/api/health");
    expect(calls[0].init.method).toBe("GET");
  });

  it("sends JSON bodies with a content type, and multipart without one", async () => {
    mockFetch(200, {});
    await api("/contact", { method: "POST", body: { a: 1 } });
    const h = calls[0].init.headers as Headers;
    expect(h.get("Content-Type")).toBe("application/json");
    expect(calls[0].init.body).toBe('{"a":1}');

    const fd = new FormData();
    fd.set("x", "1");
    await api("/consultations", { method: "POST", form: fd });
    expect((calls[1].init.headers as Headers).has("Content-Type")).toBe(false);
    expect(calls[1].init.body).toBe(fd);
  });

  it("attaches the bearer token only when signed in", async () => {
    mockFetch(200, {});
    await api("/x");
    expect((calls[0].init.headers as Headers).has("Authorization")).toBe(false);
    setToken("tok123");
    expect(getToken()).toBe("tok123");
    await api("/x");
    expect((calls[1].init.headers as Headers).get("Authorization")).toBe("Bearer tok123");
    setToken(null);
    expect(getToken()).toBeNull();
  });

  it("surfaces server error messages and field errors", async () => {
    mockFetch(409, { error: "Some items are unavailable", fields: { "oil-1": "Only 2 left" } });
    const err = await api("/orders", { method: "POST", body: {} }).catch((e: unknown) => e);
    expect(err instanceof ApiError).toBe(true);
    const e = err as ApiError;
    expect(e.status).toBe(409);
    expect(e.message).toBe("Some items are unavailable");
    expect(e.fields).toEqual({ "oil-1": "Only 2 left" });
  });

  it("signals an expired session on 401 only for authenticated requests", async () => {
    mockFetch(401, { error: "Please sign in" });
    await api("/auth/login", { method: "POST", body: {} }).catch(() => undefined);
    expect(events).toEqual([]); // wrong password on login must not look like an expired session
    setToken("old");
    await api("/auth/me").catch(() => undefined);
    expect(events).toEqual([UNAUTHORIZED_EVENT]);
  });

  it("reports network failures as status 0 with a friendly message", async () => {
    g.fetch = async () => { throw new TypeError("Failed to fetch"); };
    const err = (await api("/x").catch((e: unknown) => e)) as ApiError;
    expect(err.status).toBe(0);
    expect(errorMessage(err)).toContain("Could not reach the server");
  });

  it("falls back to a generic message for non-JSON error bodies", async () => {
    g.fetch = async () => ({ ok: false, status: 502, json: async () => { throw new Error("html"); } }) as unknown as Response;
    const err = (await api("/x").catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe("Request failed (502)");
  });

  it("errorMessage handles unknown values", () => {
    expect(errorMessage("weird")).toBe("Something went wrong. Please try again.");
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });
});

describe("guest access memory", () => {
  it("remembers the guest email per reference, case-insensitively, for this tab only", () => {
    rememberGuestEmail("order", "ord-abc123", "me@example.com");
    expect(recallGuestEmail("order", "ORD-ABC123")).toBe("me@example.com");
    expect(recallGuestEmail("booking", "ORD-ABC123")).toBeUndefined();
    expect(recallGuestEmail("order", "ORD-OTHER")).toBeUndefined();
  });
});
