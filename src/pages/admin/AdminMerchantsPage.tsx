import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type AdminMerchant } from "@/lib/adminApi";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Menunggu Review",
  needs_revision: "Perlu Perbaikan",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

export default function AdminMerchantsPage() {
  const [status, setStatus] = useState("pending_review");
  const [rows, setRows] = useState<AdminMerchant[]>([]);
  useEffect(() => { adminApi.merchants(status).then((res) => setRows(res.data)); }, [status]);
  return <div className="space-y-5 p-5 lg:p-8"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs uppercase tracking-[0.28em] text-red-300">KYC</p><h2 className="text-3xl font-black">Verifikasi Merchant</h2></div><select className="input w-56 bg-white text-ink" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">Semua</option><option value="pending_review">Menunggu Review</option><option value="needs_revision">Perlu Perbaikan</option><option value="verified">Terverifikasi</option><option value="rejected">Ditolak</option><option value="draft">Draft</option></select></div><div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.04]"><table className="w-full min-w-[860px] text-left text-sm"><thead className="bg-white/[0.04] text-xs uppercase tracking-widest text-slate-500"><tr><th className="px-5 py-4">Merchant</th><th>Status</th><th>Bank</th><th>Rekening</th><th>Checklist</th><th>Submit</th><th></th></tr></thead><tbody className="divide-y divide-white/10">{rows.map((row) => { const valid = [row.merchantNameValid,row.legalNameValid,row.ktpNumberValid,row.withdrawBankValid,row.withdrawAccountNumberValid,row.withdrawAccountNameValid].filter(Boolean).length; return <tr key={row.userId}><td className="px-5 py-4"><p className="font-black">{row.merchantName}</p><p className="text-xs text-slate-500">{row.user.email}</p></td><td>{STATUS_LABEL[row.merchantStatus]}</td><td>{row.withdrawBankName ?? "-"}</td><td>{row.withdrawAccountNumber ?? "-"}<p className="text-xs text-slate-500">{row.withdrawAccountName ?? ""}</p></td><td>{valid}/6 valid</td><td className="text-slate-400">{row.submittedAt ? new Date(row.submittedAt).toLocaleString("id-ID") : "-"}</td><td><Link className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20" to={`/admin/merchants/${row.userId}`}>Review</Link></td></tr>; })}</tbody></table></div></div>;
}
