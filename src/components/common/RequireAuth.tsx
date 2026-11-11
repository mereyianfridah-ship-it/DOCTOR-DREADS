import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { LoadingSpinner } from "./LoadingSpinner";
import { EmptyState } from "./EmptyState";

/** Signed-in customers only. Redirects to /login and returns here afterwards. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <LoadingSpinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

/** Admin-only. The backend enforces the same rule; this only avoids showing screens that would fail. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <LoadingSpinner label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== "admin")
    return (
      <EmptyState
        icon={<ShieldAlert className="h-7 w-7" />}
        title="Admin access required"
        description="Your account does not have permission to view this area."
        action={<Link to="/" className="font-semibold text-brown underline">Back to home</Link>}
      />
    );
  return <>{children}</>;
}
