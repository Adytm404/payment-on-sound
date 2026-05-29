import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ScrollToTop } from "@/components/ScrollToTop";
import { InstallPwaBanner } from "@/components/InstallPwaBanner";
import { useRealtime } from "@/hooks/useRealtime";
import { useAuth } from "@/store/AuthContext";
import { showToast } from "@/components/Toast";
import { api } from "@/lib/api";

export default function App() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const hideBottomNav = pathname.startsWith("/transaksi/");
  useRealtime();

  const handleResendVerification = async () => {
    try {
      await api.resendVerification();
      showToast("Email verifikasi telah dikirim ulang", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengirim email verifikasi", "error");
    }
  };

  return (
    <div className="app-shell relative">
      <ScrollToTop />
      <InstallPwaBanner />
      {user && !user.emailVerified ? (
        <div className="mx-5 mt-5 flex items-center justify-between gap-3 rounded-3xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
          <span>Verifikasi email kamu untuk mulai menerima pembayaran.</span>
          <button
            type="button"
            onClick={handleResendVerification}
            className="shrink-0 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white"
          >
            Kirim ulang
          </button>
        </div>
      ) : null}
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
