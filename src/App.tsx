import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useRealtime } from "@/hooks/useRealtime";
import { useAuth } from "@/store/AuthContext";

export default function App() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hideBottomNav = pathname.startsWith("/transaksi/");
  useRealtime();

  return (
    <div className="app-shell relative">
      <ScrollToTop />
      {user?.adminNote ? (
        <div className={`mx-5 mt-5 rounded-3xl border px-4 py-3 text-sm font-semibold ${user.isActive ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {user.isActive ? "Catatan admin: " : "Akun nonaktif: "}{user.adminNote}
        </div>
      ) : null}
      <Outlet />
      {!hideBottomNav ? <BottomNav /> : null}
    </div>
  );
}
