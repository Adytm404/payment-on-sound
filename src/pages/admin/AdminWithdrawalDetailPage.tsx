import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi, type AdminWithdrawal } from "@/lib/adminApi";
import type { WithdrawalSummary } from "@/lib/api";
import { Money } from "./AdminShared";

function statusLabel(status: string) {
  if (status === "pending") return "Pending";
  if (status === "approved") return "Approved";
  if (status === "processing") return "Processing";
  if (status === "paid") return "Paid";
  if (status === "rejected") return "Rejected";
  return "Cancelled";
}

export default function AdminWithdrawalDetailPage() {
  const { requestId = "" } = useParams();
  const [withdrawal, setWithdrawal] = useState<AdminWithdrawal | null>(null);
  const [balance, setBalance] = useState<WithdrawalSummary | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await adminApi.withdrawal(requestId);
    setWithdrawal(res.withdrawal);
    setBalance(res.balance);
    setAdminNote(res.withdrawal.adminNote ?? "");
  }

  useEffect(() => { load().catch((err) => setError(err instanceof Error ? err.message : "Gagal memuat detail")); }, [requestId]);

  async function action(next: "approve" | "processing" | "paid" | "reject" | "cancel") {
    setSaving(true);
    setError("");
    try {
      await adminApi.updateWithdrawal(requestId, next, adminNote);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal update status");
    } finally {
      setSaving(false);
    }
  }

  if (error && !withdrawal) return <div className="p-8 text-red-300">{error}</div>;
  if (!withdrawal) return <div className="p-8 text-slate-400">Memuat detail penarikan...</div>;
  const final = ["paid", "rejected", "cancelled"].includes(withdrawal.status);

  return (
    <div className="space-y-5 p-5 lg:p-8">
      <Link to="/admin/withdrawals" className="text-sm font-bold text-red-300 hover:text-red-200">Kembali ke penarikan</Link>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-xs uppercase tracking-[0.28em] text-red-300">Detail Penarikan</p><h2 className="text-3xl font-black">{withdrawal.requestId}</h2><p className="mt-1 text-slate-400">{statusLabel(withdrawal.status)}</p></div>
        <div className="text-right"><p className="text-sm text-slate-400">Nominal</p><p className="text-3xl font-black"><Money value={withdrawal.amount} /></p></div>
      </div>
      {error && <div className="rounded-2xl bg-red-500/15 p-3 text-sm font-bold text-red-300">{error}</div>}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs uppercase tracking-widest text-slate-500">Merchant</p><h3 className="mt-3 text-xl font-black">{withdrawal.user.settings?.merchantName ?? withdrawal.user.name}</h3><p className="text-sm text-slate-400">{withdrawal.user.email}</p></div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs uppercase tracking-widest text-slate-500">Rekening</p><h3 className="mt-3 text-xl font-black">{withdrawal.bankName}</h3><p className="font-mono text-sm text-slate-400">{withdrawal.accountNumber}</p><p className="text-sm text-slate-300">{withdrawal.accountName}</p></div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs uppercase tracking-widest text-slate-500">Saldo Tersedia</p><h3 className="mt-3 text-xl font-black">{balance ? <Money value={balance.availableBalance} /> : "-"}</h3><p className="text-sm text-slate-400">Tertunda {balance ? <Money value={balance.pendingSettlement} /> : "-"}</p><p className="text-sm text-slate-400">Reserved {balance ? <Money value={balance.reservedWithdrawal} /> : "-"}</p></div>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs uppercase tracking-widest text-slate-500">Catatan User</p><p className="mt-3 text-slate-200">{withdrawal.userNote || "-"}</p></div>
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><p className="text-xs uppercase tracking-widest text-slate-500">Catatan Admin</p><textarea className="input mt-3 min-h-28 bg-white text-ink" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} disabled={final} /></div>
      </section>
      {!final && <section className="flex flex-wrap gap-3"><button disabled={saving} onClick={() => action("approve")} className="rounded-2xl bg-blue-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Approve</button><button disabled={saving} onClick={() => action("processing")} className="rounded-2xl bg-purple-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Processing</button><button disabled={saving} onClick={() => action("paid")} className="rounded-2xl bg-emerald-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Tandai Paid</button><button disabled={saving} onClick={() => action("reject")} className="rounded-2xl bg-red-500 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Reject</button><button disabled={saving} onClick={() => action("cancel")} className="rounded-2xl bg-slate-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">Cancel</button></section>}
    </div>
  );
}
