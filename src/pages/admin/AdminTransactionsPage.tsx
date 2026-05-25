import { useEffect, useState } from "react";
import { adminApi, type AdminPlanOrder } from "@/lib/adminApi";
import { Money, StatCard } from "./AdminShared";

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-500/15 text-emerald-300",
  pending: "bg-amber-500/15 text-amber-300",
  failed: "bg-red-500/15 text-red-300",
  expired: "bg-slate-500/20 text-slate-300",
  cancelled: "bg-red-500/15 text-red-300",
};

function statusLabel(status: string) {
  return status === "paid" ? "Terbayar" : status === "pending" ? "Pending" : status === "failed" ? "Gagal" : status === "expired" ? "Expired" : "Batal";
}

export default function AdminTransactionsPage() {
  const [rows, setRows] = useState<AdminPlanOrder[]>([]);
  const [summary, setSummary] = useState({ income: 0, pending: 0, failed: 0, expired: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  useEffect(() => { const handle = window.setTimeout(() => adminApi.transactions({ search, status }).then((res) => { setRows(res.data); setSummary(res.summary); }), 250); return () => window.clearTimeout(handle); }, [search, status]);
  return (
    <div className="space-y-5 p-5 lg:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs uppercase tracking-[0.28em] text-red-300">Billing</p><h2 className="text-3xl font-black">Upgrade & Langganan Pro</h2></div><div className="flex gap-3"><input className="input max-w-sm bg-white text-ink" placeholder="Cari order/merchant/nominal" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input w-44 bg-white text-ink" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Semua</option><option value="pending">Pending</option><option value="paid">Terbayar</option><option value="failed">Gagal</option><option value="expired">Expired</option><option value="cancelled">Batal</option></select></div></div>
      <section className="grid gap-4 md:grid-cols-4"><StatCard label="Revenue Pro" value={<Money value={summary.income} />} tone="green" /><StatCard label="Pending" value={<Money value={summary.pending} />} /><StatCard label="Gagal" value={summary.failed} tone="red" /><StatCard label="Expired" value={summary.expired} /></section>
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-slate-500"><tr><th className="px-5 py-4">Order</th><th>Merchant</th><th>Status</th><th>Plan</th><th>Total Bayar</th><th>Promo</th><th>Expired Pro</th><th>Tanggal</th></tr></thead><tbody className="divide-y divide-white/10">{rows.map((order) => <tr key={order.orderId}><td className="px-5 py-4 font-mono text-xs">{order.orderId}<p className="text-[10px] text-slate-500">{order.providerReference ?? order.provider}</p></td><td>{order.user.name}<p className="text-xs text-slate-500">{order.user.email}</p></td><td><span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_STYLE[order.status] ?? "bg-white/10 text-slate-300"}`}>{statusLabel(order.status)}</span></td><td>{order.plan.name}</td><td><Money value={order.finalAmount} /><p className="text-xs text-slate-500">Diskon <Money value={order.discountAmount} /></p></td><td>{order.promoCode?.code ?? "-"}</td><td className="text-slate-400">{order.expiresAt ? new Date(order.expiresAt).toLocaleDateString("id-ID") : "-"}</td><td className="text-slate-400">{new Date(order.createdAt).toLocaleString("id-ID")}</td></tr>)}</tbody></table></div>
    </div>
  );
}
