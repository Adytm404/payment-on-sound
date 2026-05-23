import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { ToastHost } from "@/components/Toast";
import { ScrollToTop } from "@/components/ScrollToTop";
import { useRealtime } from "@/hooks/useRealtime";

export default function App() {
  const { pathname } = useLocation();
  const hideBottomNav = pathname.startsWith("/transaksi/");
  useRealtime();

  return (
    <div className="app-shell relative">
      <ScrollToTop />
      <Outlet />
      {!hideBottomNav ? <BottomNav /> : null}
      <ToastHost />
    </div>
  );
}
