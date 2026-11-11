import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { UNAUTHORIZED_EVENT, getToken, setToken } from "../api/client";
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
  const [status, setStatus] = useState<"loading" | "ready">(() => (getToken() ? "loading" : "ready"));

  // Restore the session on first load; an invalid/expired token is discarded.
  useEffect(() => {
    if (!getToken()) return;
    const ctl = new AbortController();
    getMe(ctl.signal)
      .then((r) => setUser(r.user))
      .catch(() => {
        if (!ctl.signal.aborted) setToken(null);
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
    const r = await loginUser({ email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (v: { fullName: string; email: string; phone: string; password: string }) => {
    const r = await registerUser({ ...v, terms: true });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (v: { fullName?: string; phone?: string }) => {
    const r = await updateMe(v);
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
