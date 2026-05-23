import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="screen items-center justify-center text-sm text-ink-muted">Memuat...</div>;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="screen items-center justify-center text-sm text-ink-muted">Memuat...</div>;
  }
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />;
}
