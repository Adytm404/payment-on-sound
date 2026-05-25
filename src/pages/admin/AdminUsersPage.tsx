import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type AdminUser } from "@/lib/adminApi";

function formatExpiry(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  useEffect(() => {
    const handle = window.setTimeout(() => adminApi.users({ search, role }).then((res) => setUsers(res.data)), 250);
    return () => window.clearTimeout(handle);
  }, [search, role]);

  return (
    <div className="space-y-5 p-5 lg:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-xs uppercase tracking-[0.28em] text-red-300">User</p><h2 className="text-3xl font-black">Manajemen Merchant</h2></div>
        <div className="flex gap-3"><input className="input max-w-sm bg-white text-ink" placeholder="Cari nama/email" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input w-40 bg-white text-ink" value={role} onChange={(e) => setRole(e.target.value)}><option value="all">Semua</option><option value="merchant">Merchant</option><option value="admin">Admin</option></select></div>
      </div>
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-slate-500"><tr><th className="px-5 py-4">User</th><th>Role</th><th>Plan</th><th>Expired</th><th>Status</th><th>Merchant</th><th>Transaksi</th><th>Note</th><th></th></tr></thead>
          <tbody className="divide-y divide-white/10">
            {users.map((user) => <tr key={user.id}><td className="px-5 py-4"><p className="font-black">{user.name}</p><p className="text-xs text-slate-500">{user.email}</p></td><td className="capitalize">{user.role}</td><td><span className={user.plan?.slug === "pro" ? "rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-300" : "rounded-full bg-white/10 px-2.5 py-1 text-xs font-black text-slate-300"}>{user.plan?.name ?? "Free"}</span></td><td className="text-slate-400">{user.plan?.slug === "pro" ? formatExpiry(user.planExpiresAt) : "-"}</td><td><span className={user.isActive ? "text-emerald-300" : "text-red-300"}>{user.isActive ? "Aktif" : "Nonaktif"}</span></td><td>{user.settings?.merchantName ?? "-"}<p className="text-xs text-slate-500">{user.settings?.pakasirProject || "Pakasir belum lengkap"}</p></td><td>{user._count?.transactions ?? 0}</td><td className="max-w-[220px] truncate text-slate-400">{user.adminNote || "-"}</td><td><Link to={`/admin/users/${user.id}`} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20">Detail</Link></td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
