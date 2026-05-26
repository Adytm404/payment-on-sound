import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { adminApi, type AdminMerchant } from "@/lib/adminApi";
import { showToast } from "@/components/Toast";

const fields = [
  ["merchantName", "Nama Merchant", "merchantNameValid", "merchantNameNote"],
  ["legalName", "Nama KTP", "legalNameValid", "legalNameNote"],
  ["ktpNumber", "Nomor KTP", "ktpNumberValid", "ktpNumberNote"],
  ["withdrawBankName", "Bank", "withdrawBankValid", "withdrawBankNote"],
  ["withdrawAccountNumber", "Nomor Rekening", "withdrawAccountNumberValid", "withdrawAccountNumberNote"],
  ["withdrawAccountName", "Nama Rekening", "withdrawAccountNameValid", "withdrawAccountNameNote"],
] as const;

export default function AdminMerchantDetailPage() {
  const { userId = "" } = useParams();
  const [merchant, setMerchant] = useState<AdminMerchant | null>(null);
  const load = () => adminApi.merchant(userId).then((res) => setMerchant(res.merchant));
  useEffect(() => { load(); }, [userId]);
  const update = (patch: Partial<AdminMerchant>) => setMerchant((cur) => cur ? { ...cur, ...patch } : cur);
  const saveReview = async () => {
    if (!merchant) return;
    await adminApi.saveMerchantReview(userId, merchant);
    await load(); showToast("Review tersimpan", "success");
  };
  const approve = async () => { await adminApi.approveMerchant(userId); await load(); showToast("Merchant approved", "success"); };
  const revision = async () => { await adminApi.requestMerchantRevision(userId, merchant?.verificationNote ?? ""); await load(); showToast("Permintaan perbaikan dikirim", "success"); };
  const reject = async () => { await adminApi.rejectMerchant(userId, merchant?.verificationNote ?? ""); await load(); showToast("Merchant ditolak", "info"); };
  if (!merchant) return <div className="p-8 text-slate-400">Memuat merchant...</div>;
  return <div className="space-y-6 p-5 lg:p-8"><Link to="/admin/merchants" className="text-sm font-bold text-red-300">Kembali</Link><div><p className="text-xs uppercase tracking-[0.28em] text-red-300">Review Merchant</p><h2 className="text-3xl font-black">{merchant.merchantName}</h2><p className="text-slate-400">{merchant.user.email}</p></div><section className="grid gap-5 xl:grid-cols-[1fr_0.9fr]"><div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><h3 className="mb-4 text-xl font-black">Checklist Data</h3><div className="space-y-4">{fields.map(([valueKey, label, validKey, noteKey]) => <div key={valueKey} className="rounded-2xl bg-black/25 p-4"><label className="flex items-center justify-between gap-3 text-sm font-black"><span>{label}</span><input type="checkbox" checked={Boolean(merchant[validKey])} onChange={(e) => update({ [validKey]: e.target.checked } as Partial<AdminMerchant>)} /></label><p className="mt-2 text-sm text-slate-300">{String(merchant[valueKey] ?? "-")}</p><textarea className="mt-3 min-h-16 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none" value={String(merchant[noteKey] ?? "")} onChange={(e) => update({ [noteKey]: e.target.value } as Partial<AdminMerchant>)} placeholder={`Catatan ${label}`} /></div>)}</div></div><div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5"><h3 className="text-xl font-black">Pakasir Admin</h3><div className="mt-4 grid gap-3"><input className="input bg-white text-ink" placeholder="Pakasir slug" value={merchant.pakasirProject ?? ""} onChange={(e) => update({ pakasirProject: e.target.value })} /><input className="input bg-white text-ink" placeholder="Pakasir API key" value={merchant.pakasirApiKey ?? ""} onChange={(e) => update({ pakasirApiKey: e.target.value })} /><label className="flex items-center justify-between rounded-2xl bg-black/25 px-4 py-3 text-sm font-bold">Sandbox<input type="checkbox" checked={merchant.sandbox} onChange={(e) => update({ sandbox: e.target.checked })} /></label><textarea className="min-h-24 w-full rounded-xl border border-white/10 bg-black/30 p-3 text-sm outline-none" value={merchant.verificationNote ?? ""} onChange={(e) => update({ verificationNote: e.target.value })} placeholder="Catatan umum untuk user" /></div><div className="mt-5 grid gap-3"><button onClick={saveReview} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black">Simpan Review</button><button onClick={revision} className="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-black">Minta Perbaikan</button><button onClick={approve} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black">Approve Merchant</button><button onClick={reject} className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black">Tolak</button></div></div></section></div>;
}
