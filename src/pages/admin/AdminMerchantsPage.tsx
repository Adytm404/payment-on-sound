import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi, type AdminMerchant } from "@/lib/adminApi";
import { Icon } from "@/components/Icon";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Menunggu Review",
  needs_revision: "Perlu Perbaikan",
  verified: "Terverifikasi",
  rejected: "Ditolak",
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-slate-500/15 text-slate-300",
  pending_review: "bg-amber-500/15 text-amber-300",
  needs_revision: "bg-orange-500/15 text-orange-300",
  verified: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
};

function validCount(row: AdminMerchant) {
  return [row.merchantNameValid, row.legalNameValid, row.ktpNumberValid, row.withdrawBankValid, row.withdrawAccountNumberValid, row.withdrawAccountNameValid].filter(Boolean).length;
}

export default function AdminMerchantsPage() {
  const [status, setStatus] = useState("pending_review");
  const [rows, setRows] = useState<AdminMerchant[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      adminApi.merchants(status, search).then((res) => setRows(res.data));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [status, search]);

  useEffect(() => {
    const interval = setInterval(() => {
      adminApi.merchants(status, search).then((res) => setRows(res.data)).catch(() => undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, [status, search]);

  const counts = useMemo(() => rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.merchantStatus] = (acc[row.merchantStatus] ?? 0) + 1;
    return acc;
  }, {}), [rows]);

  return (
    <div className="space-y-6 p-5 lg:p-8">
      <section className="rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(215,25,32,0.24),transparent_24rem),rgba(255,255,255,0.04)] p-6">
        <p className="text-xs uppercase tracking-[0.28em] text-red-300">KYC Merchant</p>
        <div className="mt-3 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
          <div>
            <h2 className="text-4xl font-black">Verifikasi Merchant</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Review data KTP dan rekening penarikan. Merchant baru bisa transaksi setelah semua checklist valid dan Pakasir dikonfigurasi admin.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-bold md:grid-cols-4">
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <button key={key} onClick={() => setStatus(key)} className={`rounded-2xl px-3 py-2 text-left ${status === key ? "bg-red-600 text-white" : "bg-white/10 text-slate-300 hover:bg-white/15"}`}>
                <span className="block">{label}</span>
                <span className="text-lg font-black">{counts[key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["all", "pending_review", "needs_revision", "verified", "rejected", "draft"].map((item) => (
            <button key={item} onClick={() => setStatus(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${status === item ? "bg-white text-ink" : "bg-white/10 text-slate-300"}`}>{item === "all" ? "Semua" : STATUS_LABEL[item]}</button>
          ))}
        </div>
        <input className="input max-w-md bg-white text-ink" placeholder="Cari merchant, email, bank, rekening" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8 text-center text-sm text-slate-400">Tidak ada merchant pada filter ini.</div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {rows.map((row) => {
            const progress = validCount(row);
            return (
              <Link key={row.userId} to={`/admin/merchants/${row.userId}`} className="group rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.07]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xl font-black text-white">{row.merchantName}</p>
                    <p className="text-sm text-slate-500">{row.user.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${STATUS_TONE[row.merchantStatus]}`}>{STATUS_LABEL[row.merchantStatus]}</span>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-black/25 p-3"><p className="text-xs uppercase tracking-widest text-slate-500">Bank</p><p className="mt-1 font-bold">{row.withdrawBankName ?? "-"}</p></div>
                  <div className="rounded-2xl bg-black/25 p-3"><p className="text-xs uppercase tracking-widest text-slate-500">Rekening</p><p className="mt-1 font-bold">{row.withdrawAccountNumber ?? "-"}</p></div>
                  <div className="rounded-2xl bg-black/25 p-3"><p className="text-xs uppercase tracking-widest text-slate-500">Checklist</p><p className="mt-1 font-bold">{progress}/6 valid</p></div>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Submit: {row.submittedAt ? new Date(row.submittedAt).toLocaleString("id-ID") : "Belum submit"}</span>
                  <span className="inline-flex items-center gap-1 text-red-300 group-hover:text-red-200">Review <Icon name="arrow-right" size={14} /></span>
                </div>
              </Link>
            );
          })}
        </section>
      )}
    </div>
  );
}
