import { useEffect, useState } from "react";
import { adminApi, type AdminTransaction } from "@/lib/adminApi";
import { Money, StatCard, StatusBadge } from "./AdminShared";

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<AdminTransaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, adminFee: 0, pending: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  useEffect(() => { const handle = window.setTimeout(() => adminApi.transactions({ search, status }).then((res) => { setRows(res.data); setSummary(res.summary); }), 250); return () => window.clearTimeout(handle); }, [search, status]);
  return (
    <div className="space-y-5 p-5 lg:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs uppercase tracking-[0.28em] text-red-300">Global</p><h2 className="text-3xl font-black">Semua Transaksi</h2></div><div className="flex gap-3"><input className="input max-w-sm bg-white text-ink" placeholder="Cari order/merchant/nominal" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input w-44 bg-white text-ink" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Semua</option><option value="pending">Pending</option><option value="completed">Sukses</option><option value="cancelled">Batal</option><option value="expired">Expired</option><option value="failed">Gagal</option></select></div></div>
      <section className="grid gap-4 md:grid-cols-3"><StatCard label="Income Filter" value={<Money value={summary.income} />} tone="green" /><StatCard label="Biaya Admin" value={<Money value={summary.adminFee} />} tone="red" /><StatCard label="Pending" value={<Money value={summary.pending} />} /></section>
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]"><table className="w-full min-w-[920px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-slate-500"><tr><th className="px-5 py-4">Order</th><th>Merchant</th><th>Status</th><th>Nominal</th><th>Fee</th><th>Total</th><th>Tanggal</th></tr></thead><tbody className="divide-y divide-white/10">{rows.map((tx) => <tr key={tx.orderId}><td className="px-5 py-4 font-mono text-xs">{tx.orderId}</td><td>{tx.user.name}<p className="text-xs text-slate-500">{tx.user.email}</p></td><td><StatusBadge status={tx.status} /></td><td><Money value={tx.amount} /></td><td className="text-red-300"><Money value={tx.fee} /></td><td><Money value={tx.totalPayment} /></td><td className="text-slate-400">{new Date(tx.createdAt).toLocaleString("id-ID")}</td></tr>)}</tbody></table></div>
    </div>
  );
}
