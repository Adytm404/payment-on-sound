import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Icon } from "@/components/Icon";
import { useAuth } from "@/store/AuthContext";

const links = [
  { to: "/admin", label: "Dashboard", icon: "layout-dashboard" },
  { to: "/admin/users", label: "Merchant", icon: "users" },
  { to: "/admin/plans", label: "Plan", icon: "badge-dollar-sign" },
  { to: "/admin/promos", label: "Promo", icon: "ticket-percent" },
  { to: "/admin/settings", label: "Setting", icon: "settings" },
  { to: "/admin/transactions", label: "Langganan", icon: "receipt-text" },
  { to: "/admin/reports", label: "Laporan", icon: "bar-chart-3" },
];

export default function AdminApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-shell min-h-dvh bg-[#0c1017] text-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-[#111722]/95 p-5 shadow-2xl lg:flex lg:flex-col">
        <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <img src="/qris-logo.svg" alt="QRIS" className="mb-4 h-9 w-auto brightness-0 invert" />
          <p className="text-xs uppercase tracking-[0.32em] text-red-300">Pasound Admin</p>
          <h1 className="mt-2 text-2xl font-black leading-tight">Control Room</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/admin"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  isActive ? "bg-[#D71920] text-white shadow-lg shadow-red-950/30" : "text-slate-300 hover:bg-white/10"
                }`
              }
            >
              <Icon name={link.icon} size={18} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-6 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300 hover:bg-white/10">
          <Icon name="log-out" size={18} />
          Keluar
        </button>
      </aside>

      <main className="min-h-dvh lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0c1017]/85 px-5 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-red-300">Admin</p>
              <p className="text-lg font-black">{user?.name}</p>
            </div>
            <div className="flex gap-2 lg:hidden">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} end={link.to === "/admin"} className="rounded-2xl bg-white/10 p-3 text-slate-200">
                  <Icon name={link.icon} size={18} />
                </NavLink>
              ))}
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
}
