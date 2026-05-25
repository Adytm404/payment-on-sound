import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi } from "@/lib/adminApi";
import { showToast } from "@/components/Toast";
import { Money, StatCard, StatusBadge } from "./AdminShared";

export default function AdminUserDetailPage() {
  const { userId = "" } = useParams();
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.user>> | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => adminApi.user(userId).then((res) => { setData(res); setNote(res.user.adminNote ?? ""); });
  useEffect(() => { load(); }, [userId]);

  const saveStatus = async (isActive: boolean) => {
    setSaving(true);
    try {
      await adminApi.updateUserStatus(userId, { isActive, adminNote: note });
      await load();
      showToast("Status user tersimpan", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal menyimpan status", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <div className="p-8 text-slate-400">Memuat user...</div>;

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <Link to="/admin/users" className="text-sm font-bold text-red-300">Kembali ke user</Link>
      <section className="grid gap-5 xl:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-xs uppercase tracking-[0.28em] text-red-300">Merchant Detail</p>
          <h2 className="mt-2 text-4xl font-black">{data.user.name}</h2>
          <p className="text-slate-400">{data.user.email}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm"><span className="rounded-full bg-white/10 px-3 py-1 capitalize">{data.user.role}</span><span className={data.user.isActive ? "rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-300" : "rounded-full bg-red-500/15 px-3 py-1 text-red-300"}>{data.user.isActive ? "Aktif" : "Nonaktif"}</span><span className="rounded-full bg-white/10 px-3 py-1">{data.user.settings?.merchantName ?? "Merchant"}</span></div>
        </div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
          <h3 className="text-xl font-black">Kontrol Status</h3>
          <p className="mt-1 text-sm text-slate-400">Note muncul di tampilan user. Jika nonaktif, user tidak bisa membuat/mengubah transaksi dan settings.</p>
          <textarea className="mt-4 min-h-28 w-full rounded-2xl border border-white/10 bg-black/30 p-4 text-sm outline-none focus:border-red-300" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tulis catatan untuk user" />
          <div className="mt-4 flex gap-3"><button disabled={saving} onClick={() => saveStatus(false)} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black disabled:opacity-50">Nonaktifkan</button><button disabled={saving} onClick={() => saveStatus(true)} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black disabled:opacity-50">Aktifkan / Simpan Note</button></div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4"><StatCard label="Income" value={<Money value={data.summary.income} />} tone="green" /><StatCard label="Biaya Admin" value={<Money value={data.summary.adminFee} />} tone="red" /><StatCard label="Sukses" value={data.summary.completedCount} /><StatCard label="Pending" value={<Money value={data.summary.pending} />} /></section>
      <section className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-slate-500"><tr><th className="px-5 py-4">Order</th><th>Status</th><th>Nominal</th><th>Fee</th><th>Total Bayar</th></tr></thead><tbody className="divide-y divide-white/10">{data.transactions.map((tx) => <tr key={tx.orderId}><td className="px-5 py-4 font-mono text-xs">{tx.orderId}</td><td><StatusBadge status={tx.status} /></td><td><Money value={tx.amount} /></td><td className="text-red-300"><Money value={tx.fee} /></td><td><Money value={tx.totalPayment} /></td></tr>)}</tbody></table></section>
    </div>
  );
}
