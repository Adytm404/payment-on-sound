import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type AdminWithdrawal } from "@/lib/adminApi";
import { Money, StatCard } from "./AdminShared";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  approved: "bg-blue-500/15 text-blue-300",
  processing: "bg-purple-500/15 text-purple-300",
  paid: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
  cancelled: "bg-slate-500/20 text-slate-300",
};

function statusLabel(status: string) {
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "processing") return "Processing";
  if (status === "paid") return "Paid";
  if (status === "rejected") return "Rejected";
  return "Cancelled";
}

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState<AdminWithdrawal[]>([]);
  const [summary, setSummary] = useState({ pending: 0, processing: 0, paid: 0 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      adminApi.withdrawals({ search, status }).then((res) => { setRows(res.data); setSummary(res.summary); }).catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat penarikan"));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [search, status]);

  return (
    <div className="space-y-5 p-5 lg:p-8">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-red-300">Wallet</p>
          <h2 className="text-3xl font-black">Request Penarikan</h2>
        </div>
        <div className="flex gap-3">
          <input className="input max-w-sm bg-white text-ink" placeholder="Cari request/merchant/rekening" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input w-44 bg-white text-ink" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Semua</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="processing">Processing</option><option value="paid">Paid</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      {error && <div className="rounded-2xl bg-red-500/15 p-3 text-sm font-bold text-red-300">{error}</div>}
      <section className="grid gap-4 md:grid-cols-3"><StatCard label="Pending" value={<Money value={summary.pending} />} /><StatCard label="Processing" value={<Money value={summary.processing} />} /><StatCard label="Paid" value={<Money value={summary.paid} />} tone="green" /></section>
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-slate-500"><tr><th className="px-5 py-4">Request</th><th>Merchant</th><th>Status</th><th>Nominal</th><th>Bank</th><th>Rekening</th><th>Tanggal</th><th></th></tr></thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row) => <tr key={row.requestId}><td className="px-5 py-4 font-mono text-xs">{row.requestId}</td><td>{row.user.settings?.merchantName ?? row.user.name}<p className="text-xs text-slate-500">{row.user.email}</p></td><td><span className={`rounded-full px-2.5 py-1 text-xs font-black ${STATUS_STYLE[row.status] ?? STATUS_STYLE.cancelled}`}>{statusLabel(row.status)}</span></td><td><Money value={row.amount} /></td><td>{row.bankName}</td><td className="font-mono text-xs">{row.accountNumber}<p className="font-sans text-xs text-slate-500">{row.accountName}</p></td><td className="text-slate-400">{new Date(row.createdAt).toLocaleString("id-ID")}</td><td><Link className="font-bold text-red-300 hover:text-red-200" to={`/admin/withdrawals/${row.requestId}`}>Detail</Link></td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
