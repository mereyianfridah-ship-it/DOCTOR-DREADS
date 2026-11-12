import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { UNAUTHORIZED_EVENT, getToken, setToken, loginUserCookie, registerUserCookie, getMeCookie, logoutUserCookie } from "../api/client";
import { getMe, loginUser, registerUser, updateMe } from "../api/endpoints";
import type { AuthUser } from "../types";

interface AuthValue {
  user: AuthUser | null;
  /** "loading" while a stored session is being verified with the server. */
  status: "loading" | "ready";
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (v: { fullName: string; email: string; phone: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
  updateProfile: (v: { fullName?: string; phone?: string }) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">(() => {
    // On initial load, we check for a session via the me endpoint.
    // The browser will automatically send the HttpOnly cookie with credentials: "include".
    return "loading";
  });

  // Restore the session on first load; an invalid/expired token is discarded.
  useEffect(() => {
    // Ensure the cookie-based session is verified.
    void ensureSession().then(() => {
      setStatus("ready");
    });
    const ctl = new AbortController();
    getMeCookie(ctl.signal)
      .then((r) => {
        setUser(r.user);
        setStatus("ready");
      })
      .catch(() => {
        if (!ctl.signal.aborted) {
          // Clear any stale state; the me endpoint returns 401 if no valid session.
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!ctl.signal.aborted) setStatus("ready");
      });
    return () => ctl.abort();
  }, []);

  // Any 401 on an authenticated request means the session is no longer valid.
  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Use the cookie-based login; the backend sets the HttpOnly cookie on response.
    const r = await loginUserCookie({ email, password });
    // After login, verify the session.
    await ensureSession();
    // Read the user from the me endpoint (cookie will be sent automatically).
    const me = await getMeCookie();
    setUser(me.user);
    setStatus("ready");
    return me.user;
  }, []);

  const register = useCallback(async (v: { fullName: string; email: string; phone: string; password: string }) => {
    // Use the cookie-based register; the backend sets the HttpOnly cookie on response.
    const r = await registerUserCookie({ ...v, terms: true });
    await ensureSession();
    const me = await getMeCookie();
    setUser(me.user);
    setStatus("ready");
    return me.user;
  }, []);

  const logout = useCallback(() => {
    void logoutUserCookie();
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (v: { fullName?: string; phone?: string }) => {
    const r = await updateMeCookie(v);
    setUser(r.user);
    return r.user;
  }, []);

  const value = useMemo(() => ({ user, status, login, register, logout, updateProfile }), [user, status, login, register, logout, updateProfile]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
