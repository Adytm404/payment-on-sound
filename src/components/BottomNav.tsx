import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "./Icon";

const links = [
  { to: "/", label: "Beranda", icon: "house", end: true },
  { to: "/transaksi/baru", label: "Buat", icon: "plus-circle" },
  { to: "/laporan", label: "Laporan", icon: "chart-line" },
  { to: "/pengaturan", label: "Pengaturan", icon: "settings" },
];

export function BottomNav() {
  const location = useLocation();
  const isTransactionRoute = location.pathname.startsWith("/transaksi");

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-[max(env(safe-area-inset-bottom),12px)]"
      aria-label="Navigasi utama"
    >
      <div className="pointer-events-auto mx-4 flex w-full max-w-[400px] items-center justify-between gap-1 rounded-[1.75rem] border border-white/80 bg-white/90 p-1.5 shadow-card backdrop-blur-xl">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              [
                "flex flex-1 flex-col items-center gap-0.5 rounded-[1.25rem] px-3 py-2 text-[11px] font-semibold transition active:scale-95",
                isActive
                  ? isTransactionRoute && link.to.startsWith("/transaksi")
                    ? "bg-[#D71920] text-white shadow-soft"
                    : "bg-ink text-white shadow-soft"
                  : "text-ink-muted hover:bg-surface-alt hover:text-ink",
              ].join(" ")
            }
          >
            <Icon name={link.icon} size={18} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
