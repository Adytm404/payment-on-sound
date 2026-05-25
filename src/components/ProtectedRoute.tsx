import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/store/AuthContext";

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="screen items-center justify-center text-sm text-ink-muted">Memuat...</div>;
  }
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

export function AdminRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="screen items-center justify-center text-sm text-ink-muted">Memuat...</div>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === "admin" ? <Outlet /> : <Navigate to="/" replace />;
}

export function MerchantRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="screen items-center justify-center text-sm text-ink-muted">Memuat...</div>;
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return user?.role === "admin" ? <Navigate to="/admin" replace /> : <Outlet />;
}

export function PublicOnlyRoute() {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) {
    return <div className="screen items-center justify-center text-sm text-ink-muted">Memuat...</div>;
  }
  return isAuthenticated ? <Navigate to={user?.role === "admin" ? "/admin" : "/"} replace /> : <Outlet />;
}
