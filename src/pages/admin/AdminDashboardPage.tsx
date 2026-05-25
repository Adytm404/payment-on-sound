import { useEffect, useState } from "react";
import { adminApi } from "@/lib/adminApi";
import { Money, StatCard } from "./AdminShared";

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
        <StatCard label="User Pro Aktif" value={data.summary.proUsers} tone="green" />
        <StatCard label="Income Sukses" value={<Money value={data.summary.income} />} tone="green" />
        <StatCard label="Biaya Admin" value={<Money value={data.summary.fees} />} tone="red" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Transaksi User" value={data.summary.transactions} />
        <StatCard label="Transaksi Sukses" value={data.summary.completed} />
        <StatCard label="Transaksi Pending" value={data.summary.pending} />
        <StatCard label="Income Hari Ini" value={<Money value={data.summary.todayIncome} />} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue Langganan" value={<Money value={data.summary.planRevenue} />} tone="green" />
        <StatCard label="Upgrade Pending" value={data.summary.pendingPlanOrders} />
        <StatCard label="Upgrade Gagal" value={data.summary.failedPlanOrders} tone="red" />
        <StatCard label="Upgrade Expired" value={data.summary.expiredPlanOrders} />
      </section>
    </div>
  );
}
