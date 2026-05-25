import { useEffect, useState } from "react";
import { adminApi, type AdminTransaction } from "@/lib/adminApi";
import { formatRelative } from "@/lib/format";
import { Money, StatCard, StatusBadge } from "./AdminShared";

export default function AdminDashboardPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof adminApi.dashboard>> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.dashboard().then(setData).catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat admin"));
  }, []);

  if (error) return <div className="p-8 text-red-300">{error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Memuat dashboard admin...</div>;

  return (
    <div className="space-y-8 p-5 lg:p-8">
      <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(215,25,32,0.32),transparent_28rem),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] p-6 lg:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.28em] text-red-200">Global Overview</p>
        <h2 className="mt-3 max-w-2xl text-4xl font-black leading-tight text-white lg:text-6xl">Pantau semua merchant dari satu ruang kendali.</h2>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Merchant/User" value={data.summary.users} />
        <StatCard label="Income Sukses" value={<Money value={data.summary.income} />} tone="green" />
        <StatCard label="Biaya Admin" value={<Money value={data.summary.fees} />} tone="red" />
        <StatCard label="Pending" value={data.summary.pending} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="mb-4 text-xl font-black">Transaksi Terbaru</h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-slate-500"><tr><th className="py-3">Order</th><th>Merchant</th><th>Status</th><th>Nominal</th><th>Fee</th><th>Waktu</th></tr></thead>
              <tbody className="divide-y divide-white/10">
                {data.recentTransactions.map((tx: AdminTransaction) => <tr key={tx.orderId}><td className="py-3 font-mono text-xs text-slate-300">{tx.orderId}</td><td>{tx.user.name}<p className="text-xs text-slate-500">{tx.user.email}</p></td><td><StatusBadge status={tx.status} /></td><td><Money value={tx.amount} /></td><td className="text-red-300"><Money value={tx.fee} /></td><td className="text-slate-400">{formatRelative(tx.createdAt)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5">
          <h3 className="mb-4 text-xl font-black">Top Merchant</h3>
          <div className="space-y-3">
            {data.topMerchants.map((row, index) => (
              <div key={row.user?.id ?? index} className="rounded-2xl bg-white/[0.05] p-4">
                <p className="font-black">{row.user?.name ?? "Merchant"}</p>
                <p className="text-xs text-slate-500">{row.count} transaksi sukses</p>
                <p className="mt-2 text-sm text-emerald-300"><Money value={row.amount} /></p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
